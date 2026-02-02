'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loading, Tag } from '@carbon/react';
import { WarningFilled, ErrorFilled, InformationFilled } from '@carbon/icons-react';

export default function CodeEditor({
  code,
  violations = [],
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false,
  onChange,
  onViolationClick,
  height = '100%'
}) {
  const editorRef = useRef(null);
  const [decorations, setDecorations] = useState([]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom theme for violation highlighting
    monaco.editor.defineTheme('eds-theme', {
      base: theme === 'vs-dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': theme === 'vs-dark' ? '#161616' : '#ffffff',
        'editorLineNumber.foreground': '#6f6f6f',
        'editorLineNumber.activeForeground': '#f4f4f4',
        'editor.lineHighlightBackground': theme === 'vs-dark' ? '#262626' : '#f4f4f4',
      }
    });

    monaco.editor.setTheme('eds-theme');

    // Add violation decorations
    updateDecorations(editor, monaco, violations);

    // Handle click on violation markers
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) {
        const lineNumber = e.target.position.lineNumber;
        const violation = violations.find(v => v.line === lineNumber);
        if (violation && onViolationClick) {
          onViolationClick(violation);
        }
      }
    });

    // Add hover tooltips for violations
    monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model, position) => {
        const lineNumber = position.lineNumber;
        const lineViolations = violations.filter(v => v.line === lineNumber);

        if (lineViolations.length === 0) return null;

        return {
          contents: lineViolations.map(v => ({
            value: `**${getSeverityLabel(v.severity)}**: ${v.message}\n\n*Fix:* ${v.suggestedFix}`
          }))
        };
      }
    });
  };

  const updateDecorations = (editor, monaco, violations) => {
    if (!editor || !monaco) return;

    const newDecorations = violations.map(v => ({
      range: new monaco.Range(v.line, 1, v.line, 1),
      options: {
        isWholeLine: true,
        className: `violation-line-${v.severity}`,
        glyphMarginClassName: `violation-glyph-${v.severity}`,
        glyphMarginHoverMessage: { value: `**${v.type}**: ${v.message}` },
        overviewRuler: {
          color: getViolationColor(v.severity),
          position: monaco.editor.OverviewRulerLane.Right
        },
        minimap: {
          color: getViolationColor(v.severity),
          position: monaco.editor.MinimapPosition.Inline
        }
      }
    }));

    const oldDecorations = decorations;
    const newIds = editor.deltaDecorations(oldDecorations, newDecorations);
    setDecorations(newIds);
  };

  useEffect(() => {
    if (editorRef.current && window.monaco) {
      updateDecorations(editorRef.current, window.monaco, violations);
    }
  }, [violations]);

  const getViolationColor = (severity) => {
    switch (severity) {
      case 'error': return '#da1e28';
      case 'warning': return '#f1c21b';
      case 'info': return '#0f62fe';
      default: return '#8d8d8d';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'error': return '🔴 Error';
      case 'warning': return '🟡 Warning';
      case 'info': return '🔵 Info';
      default: return 'Issue';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <ErrorFilled size={16} style={{ color: '#da1e28' }} />;
      case 'warning': return <WarningFilled size={16} style={{ color: '#f1c21b' }} />;
      case 'info': return <InformationFilled size={16} style={{ color: '#0f62fe' }} />;
      default: return null;
    }
  };

  const handleEditorChange = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  const scrollToViolation = (violation) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(violation.line);
      editorRef.current.setPosition({ lineNumber: violation.line, column: violation.column || 1 });
      editorRef.current.focus();
    }
  };

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Violation summary bar */}
      {violations.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--cds-layer-01)',
          borderBottom: '1px solid var(--cds-border-subtle)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
            {violations.length} violation{violations.length !== 1 ? 's' : ''}:
          </span>
          {violations.slice(0, 5).map((v, i) => (
            <Tag
              key={i}
              type={v.severity === 'error' ? 'red' : v.severity === 'warning' ? 'warm-gray' : 'blue'}
              size="sm"
              onClick={() => {
                scrollToViolation(v);
                if (onViolationClick) onViolationClick(v);
              }}
              style={{ cursor: 'pointer' }}
            >
              Line {v.line}: {v.type}
            </Tag>
          ))}
          {violations.length > 5 && (
            <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
              +{violations.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="eds-theme"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={<Loading description="Loading editor..." />}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', 'SF Mono', Consolas, monospace",
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 4,
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      <style jsx global>{`
        .violation-line-error {
          background: rgba(218, 30, 40, 0.1) !important;
          border-left: 3px solid #da1e28 !important;
        }
        .violation-line-warning {
          background: rgba(241, 194, 27, 0.1) !important;
          border-left: 3px solid #f1c21b !important;
        }
        .violation-line-info {
          background: rgba(15, 98, 254, 0.1) !important;
          border-left: 3px solid #0f62fe !important;
        }
        .violation-glyph-error {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23da1e28'%3E%3Ccircle cx='8' cy='8' r='6'/%3E%3C/svg%3E") center center no-repeat;
          background-size: 12px;
        }
        .violation-glyph-warning {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23f1c21b'%3E%3Cpolygon points='8,2 15,14 1,14'/%3E%3C/svg%3E") center center no-repeat;
          background-size: 12px;
        }
        .violation-glyph-info {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%230f62fe'%3E%3Ccircle cx='8' cy='8' r='6'/%3E%3C/svg%3E") center center no-repeat;
          background-size: 12px;
        }
      `}</style>
    </div>
  );
}
