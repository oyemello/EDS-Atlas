'use client';

import { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  Button,
  Loading,
  InlineNotification
} from '@carbon/react';
import { Send } from '@carbon/icons-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FigmaSnapshot from './FigmaSnapshot';
import ComplianceGauge from './ComplianceGauge';
import {
  analyzeFile,
  startRepoAnalysis,
  pollAnalysis,
  analyzeFigma,
  generateCodeFromFigma,
  detectUrlType,
  chat
} from '../../lib/api';

export default function ChatInterface({ onAnalysisComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load chat history
    fetch('http://localhost:3001/api/chat/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err => console.error('Failed to load chat history:', err));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role, content, type = 'text') => {
    setMessages(prev => [...prev, { role, content, type }]);
  };

  const updateLastMessage = (content) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1].content = content;
      return newMessages;
    });
  };

  const addSnapshotMessage = (imageUrl, frameName, summary, complianceScore, violations) => {
    if (!imageUrl) return;
    setMessages(prev => [...prev, {
      role: 'assistant',
      type: 'figma-snapshot',
      imageUrl,
      frameName,
      summary,
      complianceScore,
      violations
    }]);
  };

  const splitIntoBubbles = (content = '') => {
    const lines = content.split('\n');
    const bubbles = [];
    let buffer = [];
    let inFence = false;

    lines.forEach((line, idx) => {
      const fence = line.trim().startsWith('```');
      if (fence) inFence = !inFence;

      if (!inFence && line.trim() === '') {
        if (buffer.length) {
          bubbles.push(buffer.join('\n'));
          buffer = [];
        }
      } else {
        buffer.push(line);
      }

      // Flush at end
      if (idx === lines.length - 1 && buffer.length) {
        bubbles.push(buffer.join('\n'));
      }
    });

    return bubbles.length ? bubbles : [''];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    addMessage('user', userInput);
    setIsLoading(true);

    try {
      const urlType = detectUrlType(userInput);

      if (urlType === 'github') {
        await handleGitHubAnalysis(userInput);
      } else if (urlType === 'figma') {
        await handleFigmaAnalysis(userInput);
      } else if (userInput.includes('function') || userInput.includes('const') || userInput.includes('import') || userInput.includes('<')) {
        await handleCodeAnalysis(userInput);
      } else {
        await handleGeneralChat(userInput);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      addMessage('assistant', `❌ **Error**: ${error.message}

Please try again or check that:
- The URL is valid and accessible
- The repository is public (or you have access)
- The backend server is running on port 3001`);
    } finally {
      setIsLoading(false);
      setAnalysisProgress(null);
    }
  };

  const handleGitHubAnalysis = async (repoUrl) => {
    addMessage('assistant', `🔍 Starting analysis of repository...`);

    try {
      const { analysisId } = await startRepoAnalysis(repoUrl);

      const results = await pollAnalysis(analysisId, (status) => {
        setAnalysisProgress(status);
        updateLastMessage(`🔍 ${status.message || 'Analyzing...'} (${status.progress}%)`);
      });

      displayRepoResults(results);
      if (onAnalysisComplete) onAnalysisComplete(results);
    } catch (error) {
      throw error;
    }
  };

  const displayRepoResults = (results) => {
    const complianceClass = getComplianceClass(results.overallCompliance);

    const content = `## 📊 Analysis Complete: ${results.repoName}

### Overall Compliance: <span class="${complianceClass}">${results.overallCompliance}%</span>

| Metric | Count |
|--------|-------|
| Total Files Analyzed | ${results.analyzedFiles} / ${results.totalFiles} |
| Total Violations | ${results.totalViolations} |
| Critical Issues | ${results.criticalViolations} |
| Warnings | ${results.warnings} |

### 🔥 Top Issues Found

${results.patterns.slice(0, 3).map(p => `- **${p.type}**: ${p.instances} instances across ${p.files.length} files`).join('\n')}

### 📁 Files Needing Attention

${results.topViolatingFiles.slice(0, 5).map(f => `- \`${f.filePath}\` - ${f.violations} violations (${f.complianceScore}% compliant)`).join('\n')}

---

💡 **Next Steps:**
1. Click on any file above to see detailed violations
2. Navigate to **Engineer** view for code-level fixes
3. Check the **Dashboard** for trends and metrics

Would you like me to show the violations for a specific file?`;

    updateLastMessage(content);
  };

  const handleFigmaAnalysis = async (figmaUrl, context = '') => {
    // Remove the "Analyzing..." placeholder
    // setMessages(prev => prev.slice(0, -1)); // Wait, we haven't added it yet in the new flow? 
    // Actually, calling addMessage occurs before this in handleSubmit usually.
    // Let's assume the flow is consistent.

    addMessage('assistant', '🎨 Analyzing Figma design' + (context ? ` with context: "${context}"` : '') + '...');

    try {
      const results = await analyzeFigma(figmaUrl, context);

      if (!results || results.error || results.success === false) {
        updateLastMessage(`❌ Figma analysis failed${results?.error ? `: ${results.error}` : ''}. Please confirm the link is a frame URL and the backend is running on port 3001.`);
        return;
      }

      // Remove the "Analyzing..." placeholder
      setMessages(prev => prev.slice(0, -1));

      // 1. Show Visual Snapshot with Score & Violations FIRST
      addSnapshotMessage(
        results.imageUrl,
        results.frameName,
        results.summary,
        results.complianceScore,
        results.violations
      );

      // 2. Show detailed Carbon Equivalent & Next Steps SECOND
      const content = `Would you like me to generate Carbon React code from this design?`;

      addMessage('assistant', content);

    } catch (error) {
      console.error('Figma analysis error:', error);
      updateLastMessage(`❌ Figma analysis failed: ${error.message || 'Unknown error'}`);
    }
  };

  const displayFigmaResults = (results) => {
    const complianceClass = getComplianceClass(results.complianceScore);

    const content = `## 🎨 Figma Analysis: ${results.frameName}

### Compliance Score: <span class="${complianceClass}">${results.complianceScore}%</span>

**Detected Component Type:** ${results.componentType}

### Carbon Equivalent
\`\`\`jsx
${results.carbonEquivalent}
\`\`\`

### ⚠️ Violations Found

${results.violations.map(v => `- **${v.element}** (${v.severity})
  - Current: \`${v.current}\`
  - Expected: \`${v.expected}\`
  - Use: \`${v.carbonToken}\``).join('\n\n')}

---

💡 **Designer Actions:**
${results.violations.map(v => `- Update ${v.element} to use Carbon token \`${v.carbonToken}\``).join('\n')}

Would you like me to generate Carbon React code from this design?`;

    updateLastMessage(content);
  };

  const handleCodeAnalysis = async (code) => {
    addMessage('assistant', '🔍 Analyzing code...');

    try {
      const results = await analyzeFile(code);
      displayCodeResults(results, code);
    } catch (error) {
      throw error;
    }
  };

  const handleGeneralChat = async (text) => {
    addMessage('assistant', '🤔 Thinking...');
    try {
      const result = await chat(text);
      updateLastMessage(result.reply || 'I could not generate a response.');
    } catch (error) {
      console.error('Chat error:', error);
      updateLastMessage('Sorry, I could not process that right now.');
    }
  };

  const displayCodeResults = (results, code) => {
    const complianceClass = getComplianceClass(results.complianceScore);

    const content = `## 🔍 Code Analysis Results

### Compliance Score: <span class="${complianceClass}">${results.complianceScore}%</span>

${results.summary}

### Violations Found (${results.violations?.length || 0})

${results.violations?.map(v => `#### Line ${v.line}: ${v.type}
- **Severity:** ${v.severity === 'error' ? '🔴 Error' : v.severity === 'warning' ? '🟡 Warning' : '🔵 Info'}
- **Issue:** ${v.message}
- **Fix:** ${v.suggestedFix}
${v.carbonToken ? `- **Token:** \`${v.carbonToken}\`` : ''}
${v.carbonComponent ? `- **Component:** \`${v.carbonComponent}\`` : ''}`).join('\n\n') || 'No violations found! ✅'}

---

Navigate to the **Engineer** view to see violations inline in the code editor and apply fixes.`;

    updateLastMessage(content);
  };

  const getComplianceClass = (score) => {
    if (score >= 90) return 'compliance-excellent';
    if (score >= 70) return 'compliance-good';
    if (score >= 50) return 'compliance-needs-work';
    return 'compliance-poor';
  };

  return (
    <div className="chat-container">
      <div
        className="chat-messages"
        style={{
          width: 'calc(100% - 300px)',
          maxWidth: '960px',
          margin: '0 auto',
          paddingTop: '16px',
          paddingBottom: '340px'
        }}
      >
        {messages.map((message, index) => {
          if (message.type === 'figma-snapshot') {
            return (
              <div
                key={`snapshot-${index}`}
                className={`chat-message ${message.role} animate-fade-in`}
                style={{ padding: 0, background: 'transparent' }}
              >
                {/* Separate Compliance Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'var(--cds-layer-01)', padding: '12px', borderRadius: '8px' }}>
                  <ComplianceGauge value={message.complianceScore} size={64} stroke={6} />
                  <div>
                    <h4 style={{ margin: 0 }}>Compliance Score</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)', maxWidth: '400px', lineHeight: '1.4' }}>
                      {message.summary || 'Based on Carbon Design System tokens'}
                    </p>
                  </div>
                </div>

                <FigmaSnapshot
                  imageUrl={message.imageUrl}
                  frameName={message.frameName}
                  summary={message.summary}
                  violations={message.violations}
                />
              </div>
            );
          }

          const bubbles = splitIntoBubbles(message.content);
          return bubbles.map((bubble, bubbleIdx) => (
            <div
              key={`${index}-${bubbleIdx}`}
              className={`chat-message ${message.role} animate-fade-in`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    span({ className, children }) {
                      return <span className={className}>{children}</span>;
                    }
                  }}
                >
                  {bubble}
                </ReactMarkdown>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{bubble}</div>
              )}
            </div>
          ));
        })}

        {isLoading && analysisProgress && (
          <div className="chat-message assistant animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Loading small withOverlay={false} />
              <div>
                <div>{analysisProgress.message || 'Processing...'}</div>
                <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                  {analysisProgress.progress}% complete
                  {analysisProgress.currentFile && ` • ${analysisProgress.currentFile}`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: '20px',
          zIndex: 10,
          width: 'calc(100% - 300px)',
          maxWidth: '960px',
          margin: '0 auto',
          background: 'var(--cds-layer-02)',
          border: '1px solid var(--cds-border-subtle)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          style={{ display: 'flex', gap: '8px' }}
        >
          <TextInput
            id="chat-input"
            name="chat-input"
            labelText=""
            hideLabel
            placeholder="Paste a GitHub URL, Figma URL, or React code..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
            inputMode="text"
            type="text"
            data-lpignore="true"
            data-form-type="other"
            size="lg"
            style={{ flex: 1 }}
          />
          <Button
            type="submit"
            kind="primary"
            disabled={isLoading || !input.trim()}
            renderIcon={Send}
            hasIconOnly
            iconDescription="Send"
            size="lg"
          />
        </form>
      </div>
    </div>
  );
}
