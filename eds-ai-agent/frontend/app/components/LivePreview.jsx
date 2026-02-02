'use client';

import { useState, useEffect } from 'react';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';
import { InlineNotification, Button, Tag } from '@carbon/react';
import { Renew, ZoomIn, ZoomOut } from '@carbon/icons-react';

// Carbon components to inject into scope
import * as CarbonReact from '@carbon/react';
import * as CarbonIcons from '@carbon/icons-react';

export default function LivePreview({
  code,
  violations = [],
  onViolationClick,
  showOverlay = true
}) {
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [key, setKey] = useState(0);

  // Build scope with Carbon components and React
  const scope = {
    ...CarbonReact,
    ...CarbonIcons,
    React: require('react'),
    useState: require('react').useState,
    useEffect: require('react').useEffect,
  };

  // Transform code to be renderable
  const transformCode = (rawCode) => {
    // Remove import statements
    let transformed = rawCode.replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, '');

    // Remove export statements
    transformed = transformed.replace(/export\s+default\s+/g, '');
    transformed = transformed.replace(/export\s+/g, '');

    // If the code defines a function component, render it
    const functionMatch = transformed.match(/function\s+(\w+)/);
    if (functionMatch) {
      const componentName = functionMatch[1];
      transformed += `\nrender(<${componentName} />);`;
    }

    // If the code is a const arrow function component
    const constMatch = transformed.match(/const\s+(\w+)\s*=\s*\(/);
    if (constMatch && !functionMatch) {
      const componentName = constMatch[1];
      transformed += `\nrender(<${componentName} />);`;
    }

    return transformed;
  };

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    setError(null);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cds-layer-01)'
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--cds-layer-02)',
        borderBottom: '1px solid var(--cds-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Live Preview</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={ZoomOut}
            iconDescription="Zoom out"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={zoom <= 50}
          />
          <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
            {zoom}%
          </span>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={ZoomIn}
            iconDescription="Zoom in"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            disabled={zoom >= 200}
          />
          <div style={{ width: '1px', height: '20px', background: 'var(--cds-border-subtle)', margin: '0 8px' }} />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={Renew}
            iconDescription="Refresh preview"
            onClick={handleRefresh}
          />
        </div>
      </div>

      {/* Preview area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
        position: 'relative'
      }}>
        <div style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          transition: 'transform 0.2s ease'
        }}>
          <LiveProvider
            key={key}
            code={transformCode(code)}
            scope={scope}
            noInline={true}
          >
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              minHeight: '200px'
            }}>
              <ReactLivePreview />
            </div>

            <LiveError
              style={{
                background: '#fff1f1',
                color: '#da1e28',
                padding: '12px 16px',
                marginTop: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: "'IBM Plex Mono', monospace",
                whiteSpace: 'pre-wrap'
              }}
            />
          </LiveProvider>
        </div>

        {/* Violation overlay */}
        {showOverlay && violations.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '300px'
          }}>
            {violations.slice(0, 3).map((v, i) => (
              <div
                key={i}
                onClick={() => onViolationClick && onViolationClick(v)}
                style={{
                  background: v.severity === 'error' ? '#fff1f1' : v.severity === 'warning' ? '#fdf6dd' : '#edf5ff',
                  border: `1px solid ${v.severity === 'error' ? '#da1e28' : v.severity === 'warning' ? '#f1c21b' : '#0f62fe'}`,
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: v.severity === 'error' ? '#da1e28' : v.severity === 'warning' ? '#8a6d0b' : '#0043ce'
                }}>
                  Line {v.line}: {v.type}
                </div>
                <div style={{ color: 'var(--cds-text-secondary)' }}>
                  {v.message.slice(0, 80)}...
                </div>
              </div>
            ))}
            {violations.length > 3 && (
              <Tag type="gray" size="sm">
                +{violations.length - 3} more violations
              </Tag>
            )}
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--cds-layer-02)',
        borderTop: '1px solid var(--cds-border-subtle)',
        fontSize: '12px',
        color: 'var(--cds-text-secondary)',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          {violations.length === 0
            ? '✅ No violations detected'
            : `⚠️ ${violations.length} violation${violations.length !== 1 ? 's' : ''} in preview`
          }
        </span>
        <span>React Live Preview</span>
      </div>
    </div>
  );
}
