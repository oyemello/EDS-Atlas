'use client';

import { useState, useRef, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import ViolationPanel from './ViolationPanel';
import { Button, Toggle } from '@carbon/react';
import { SidePanelOpen, SidePanelClose, Code, View } from '@carbon/icons-react';

export default function SplitView({
  code,
  violations = [],
  onChange,
  onApplyFix,
  showViolationPanel = true
}) {
  const [leftWidth, setLeftWidth] = useState(50);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showPanel, setShowPanel] = useState(showViolationPanel && violations.length > 0);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'code', 'preview'
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Clamp between 20% and 80%
    setLeftWidth(Math.max(20, Math.min(80, newWidth)));
  }, []);

  const handleViolationClick = (violation) => {
    setSelectedViolation(violation);
    setShowPanel(true);
  };

  const handleApplyFix = async (violation, fixedCode) => {
    if (onApplyFix) {
      await onApplyFix(violation, fixedCode);
    }
    setSelectedViolation(null);
  };

  const panelWidth = showPanel ? 350 : 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        position: 'relative'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Main content area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          transition: showPanel ? 'width 0.2s ease' : 'none',
          width: showPanel ? `calc(100% - ${panelWidth}px)` : '100%'
        }}
      >
        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: showPanel ? panelWidth : 0,
          height: '40px',
          background: 'var(--cds-layer-02)',
          borderBottom: '1px solid var(--cds-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 10,
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              kind={viewMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              hasIconOnly
              renderIcon={Code}
              iconDescription="Code only"
              onClick={() => setViewMode('code')}
            />
            <Button
              kind={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
            >
              Split
            </Button>
            <Button
              kind={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              hasIconOnly
              renderIcon={View}
              iconDescription="Preview only"
              onClick={() => setViewMode('preview')}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {violations.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                {violations.filter(v => v.severity === 'error').length} errors,{' '}
                {violations.filter(v => v.severity === 'warning').length} warnings
              </span>
            )}
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={showPanel ? SidePanelClose : SidePanelOpen}
              iconDescription={showPanel ? 'Hide panel' : 'Show panel'}
              onClick={() => setShowPanel(!showPanel)}
              disabled={violations.length === 0}
            />
          </div>
        </div>

        {/* Content area */}
        <div style={{
          display: 'flex',
          flex: 1,
          marginTop: '40px',
          height: 'calc(100% - 40px)'
        }}>
          {/* Code Editor */}
          {(viewMode === 'split' || viewMode === 'code') && (
            <div style={{
              width: viewMode === 'split' ? `${leftWidth}%` : '100%',
              height: '100%',
              borderRight: viewMode === 'split' ? '1px solid var(--cds-border-subtle)' : 'none'
            }}>
              <CodeEditor
                code={code}
                violations={violations}
                onChange={onChange}
                onViolationClick={handleViolationClick}
              />
            </div>
          )}

          {/* Resizer */}
          {viewMode === 'split' && (
            <div
              style={{
                width: '4px',
                background: 'var(--cds-border-subtle)',
                cursor: 'col-resize',
                transition: 'background 0.1s ease'
              }}
              onMouseDown={handleMouseDown}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0f62fe'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--cds-border-subtle)'}
            />
          )}

          {/* Live Preview */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div style={{
              width: viewMode === 'split' ? `${100 - leftWidth}%` : '100%',
              height: '100%'
            }}>
              <LivePreview
                code={code}
                violations={violations}
                onViolationClick={handleViolationClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Violation Panel */}
      {showPanel && (
        <div style={{
          width: panelWidth,
          height: '100%',
          borderLeft: '1px solid var(--cds-border-subtle)',
          background: 'var(--cds-layer-01)',
          animation: 'slideIn 0.2s ease'
        }}>
          <ViolationPanel
            violations={violations}
            selectedViolation={selectedViolation}
            code={code}
            onViolationSelect={setSelectedViolation}
            onApplyFix={handleApplyFix}
            onClose={() => setShowPanel(false)}
          />
        </div>
      )}
    </div>
  );
}
