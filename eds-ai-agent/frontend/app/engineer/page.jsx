'use client';

import { useState } from 'react';
import {
  TextInput,
  Button,
  Loading,
  InlineNotification,
  FileUploader,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@carbon/react';
import { Search, Code, Upload, Play } from '@carbon/icons-react';
import SplitView from '../components/SplitView';
import { analyzeFile, startRepoAnalysis, pollAnalysis } from '../../lib/api';

export default function EngineerPage() {
  const [inputMode, setInputMode] = useState('paste'); // 'paste', 'github', 'upload'
  const [code, setCode] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [violations, setViolations] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleAnalyzeCode = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeFile(code, 'component.jsx');
      setViolations(result.violations || []);
      setAnalysisComplete(true);
    } catch (err) {
      setError(err.message || 'Failed to analyze code');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRepo = async () => {
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setProgress({ status: 'starting', progress: 0 });

    try {
      const { analysisId } = await startRepoAnalysis(repoUrl);
      const results = await pollAnalysis(analysisId, setProgress);
      if (results.fileAnalyses && results.fileAnalyses.length > 0) {
        setViolations(results.fileAnalyses[0].violations);
        // Would need to fetch actual file content
      }
      setAnalysisComplete(true);
    } catch (err) {
      setError(err.message || 'Failed to analyze repository');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleApplyFix = async (violation, fixedCode) => {
    setCode(fixedCode);
    setViolations(prev => prev.filter(v =>
      v.line !== violation.line || v.type !== violation.type
    ));
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        background: 'var(--cds-layer-02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Code size={24} />
            <h1 style={{ fontSize: '20px' }}>Engineer View</h1>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          </div>
        </div>

        {!analysisComplete && (
          <Tabs>
            <TabList aria-label="Input modes">
              <Tab onClick={() => setInputMode('paste')}>Paste Code</Tab>
              <Tab onClick={() => setInputMode('github')}>GitHub Repo</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <div style={{ paddingTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      id="code-input"
                      labelText="Paste React/JavaScript code"
                      placeholder="Paste your component code here..."
                      value={code.slice(0, 100) + '...'}
                      readOnly
                      onClick={() => {}}
                    />
                  </div>
                  <Button
                    kind="primary"
                    renderIcon={Play}
                    onClick={handleAnalyzeCode}
                    disabled={loading}
                  >
                    Analyze Code
                  </Button>
                </div>
              </TabPanel>
              <TabPanel>
                <div style={{ paddingTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      id="repo-url"
                      labelText="GitHub Repository URL"
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button
                    kind="primary"
                    renderIcon={Search}
                    onClick={handleAnalyzeRepo}
                    disabled={loading || !repoUrl.trim()}
                  >
                    Analyze Repo
                  </Button>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}

        {loading && progress && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Loading small withOverlay={false} />
              <span>{progress.message || 'Analyzing...'}</span>
              <span style={{ color: 'var(--cds-text-secondary)' }}>
                {progress.progress}%
              </span>
            </div>
          </div>
        )}

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onClose={() => setError(null)}
            style={{ marginTop: '16px' }}
          />
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {analysisComplete ? (
          <SplitView
            code={code}
            violations={violations}
            onChange={setCode}
            onApplyFix={handleApplyFix}
          />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '24px',
            padding: '48px'
          }}>
            <Code size={64} style={{ color: 'var(--cds-text-secondary)' }} />
            <h2>Code Inspector</h2>
            <p style={{ color: 'var(--cds-text-secondary)', textAlign: 'center', maxWidth: '500px' }}>
              Paste React code or enter a GitHub repository URL to analyze for Carbon Design System compliance.
              You'll see violations highlighted inline with suggested fixes.
            </p>

            {/* Quick code editor for pasting */}
            <div style={{
              width: '100%',
              maxWidth: '800px',
              background: '#262626',
              borderRadius: '4px',
              padding: '16px'
            }}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your React component code here..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  background: 'transparent',
                  border: 'none',
                  color: '#f4f4f4',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            <Button
              kind="primary"
              size="lg"
              renderIcon={Play}
              onClick={handleAnalyzeCode}
              disabled={loading || !code.trim()}
            >
              Analyze This Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
