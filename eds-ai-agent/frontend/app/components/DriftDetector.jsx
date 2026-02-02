'use client';

import { useState } from 'react';
import {
  Button,
  Tag,
  Tile,
  Loading,
  InlineNotification,
  ProgressBar
} from '@carbon/react';
import {
  ArrowRight,
  Warning,
  Checkmark,
  Close
} from '@carbon/icons-react';
import CodeEditor from './CodeEditor';
import FigmaViewer from './FigmaViewer';

export default function DriftDetector({
  figmaData,
  code,
  driftItems = [],
  alignmentScore,
  summary,
  isLoading = false,
  onApplyFix
}) {
  const [selectedDrift, setSelectedDrift] = useState(null);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'overlay'

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#da1e28';
      case 'major': return '#f1c21b';
      case 'minor': return '#0f62fe';
      default: return '#8d8d8d';
    }
  };

  const getSeverityTag = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'major': return 'warm-gray';
      case 'minor': return 'blue';
      default: return 'gray';
    }
  };

  const getDriftIcon = (type) => {
    switch (type) {
      case 'color-drift':
        return '🎨';
      case 'spacing-drift':
        return '📏';
      case 'typography-drift':
        return '🔤';
      case 'structure-drift':
        return '🏗️';
      case 'missing-element':
        return '❓';
      case 'extra-element':
        return '➕';
      default:
        return '⚠️';
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Loading description="Detecting design-code drift..." />
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Comparing Figma design to code implementation...
        </p>
      </div>
    );
  }

  const criticalCount = driftItems.filter(d => d.severity === 'critical').length;
  const majorCount = driftItems.filter(d => d.severity === 'major').length;
  const minorCount = driftItems.filter(d => d.severity === 'minor').length;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        background: 'var(--cds-layer-02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '20px' }}>Design-Code Drift Detection</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              kind={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </Button>
            <Button
              kind={viewMode === 'overlay' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('overlay')}
            >
              Overlay
            </Button>
          </div>
        </div>

        {/* Alignment score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
              Alignment Score
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 600,
                color: alignmentScore >= 80 ? '#198038' : alignmentScore >= 60 ? '#f1c21b' : '#da1e28'
              }}>
                {alignmentScore || 0}%
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <ProgressBar
              value={alignmentScore || 0}
              max={100}
              status={alignmentScore >= 80 ? 'finished' : alignmentScore >= 60 ? 'active' : 'error'}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {criticalCount > 0 && (
              <Tag type="red" size="sm">
                {criticalCount} Critical
              </Tag>
            )}
            {majorCount > 0 && (
              <Tag type="warm-gray" size="sm">
                {majorCount} Major
              </Tag>
            )}
            {minorCount > 0 && (
              <Tag type="blue" size="sm">
                {minorCount} Minor
              </Tag>
            )}
          </div>
        </div>

        {summary && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--cds-text-secondary)' }}>
            {summary}
          </p>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'side-by-side' ? (
          <>
            {/* Figma Design Panel */}
            <div style={{ flex: 1, borderRight: '1px solid var(--cds-border-subtle)' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--cds-border-subtle)',
                background: 'var(--cds-layer-01)',
                fontWeight: 500
              }}>
                Figma Design
              </div>
              <div style={{
                height: 'calc(100% - 44px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--cds-layer-01)'
              }}>
                {figmaData?.imageUrl ? (
                  <img
                    src={figmaData.imageUrl}
                    alt="Figma design"
                    style={{ maxWidth: '90%', maxHeight: '90%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '60px',
                    background: '#0f62fe',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                  }}>
                    {figmaData?.frameName || 'Design Preview'}
                  </div>
                )}
              </div>
            </div>

            {/* Code Panel */}
            <div style={{ flex: 1, borderRight: '1px solid var(--cds-border-subtle)' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--cds-border-subtle)',
                background: 'var(--cds-layer-01)',
                fontWeight: 500
              }}>
                Code Implementation
              </div>
              <div style={{ height: 'calc(100% - 44px)' }}>
                <CodeEditor
                  code={code}
                  violations={driftItems.map(d => ({
                    line: 1,
                    type: d.type,
                    severity: d.severity === 'critical' ? 'error' : d.severity === 'major' ? 'warning' : 'info',
                    message: d.message
                  }))}
                  readOnly
                />
              </div>
            </div>

            {/* Drift Items Panel */}
            <div style={{ width: '350px', overflow: 'auto' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--cds-border-subtle)',
                background: 'var(--cds-layer-01)',
                fontWeight: 500
              }}>
                Drift Items ({driftItems.length})
              </div>
              <div style={{ padding: '12px' }}>
                {driftItems.length === 0 ? (
                  <InlineNotification
                    kind="success"
                    title="Perfect alignment!"
                    subtitle="Code matches the Figma design"
                    hideCloseButton
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {driftItems.map((drift, index) => (
                      <Tile
                        key={index}
                        onClick={() => setSelectedDrift(drift)}
                        style={{
                          cursor: 'pointer',
                          borderLeft: `3px solid ${getSeverityColor(drift.severity)}`,
                          background: selectedDrift === drift ? 'var(--cds-layer-01)' : 'var(--cds-layer-02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{getDriftIcon(drift.type)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 500 }}>{drift.element}</span>
                              <Tag type={getSeverityTag(drift.severity)} size="sm">
                                {drift.severity}
                              </Tag>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                              {drift.message}
                            </p>

                            {/* Value comparison */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              padding: '8px',
                              background: 'var(--cds-layer-01)',
                              borderRadius: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {drift.type === 'color-drift' && (
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: drift.designValue,
                                    borderRadius: '2px',
                                    border: '1px solid var(--cds-border-subtle)'
                                  }} />
                                )}
                                <span>{drift.designValue}</span>
                              </div>
                              <ArrowRight size={12} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {drift.type === 'color-drift' && (
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: drift.codeValue,
                                    borderRadius: '2px',
                                    border: '1px solid var(--cds-border-subtle)'
                                  }} />
                                )}
                                <span style={{ color: '#da1e28' }}>{drift.codeValue}</span>
                              </div>
                            </div>

                            {/* Suggested fix */}
                            {drift.suggestedFix && (
                              <div style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: '#edf5ff',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                <strong>Fix:</strong> {drift.suggestedFix}
                              </div>
                            )}

                            {/* Apply fix button */}
                            <Button
                              kind="tertiary"
                              size="sm"
                              style={{ marginTop: '8px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onApplyFix && onApplyFix(drift);
                              }}
                            >
                              Apply Fix
                            </Button>
                          </div>
                        </div>
                      </Tile>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Overlay mode - simplified comparison */
          <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {driftItems.map((drift, index) => (
                <Tile key={index}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>{getDriftIcon(drift.type)}</span>
                    <div>
                      <h4>{drift.element}</h4>
                      <Tag type={getSeverityTag(drift.severity)} size="sm">
                        {drift.severity}
                      </Tag>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '16px',
                    background: 'var(--cds-layer-01)',
                    borderRadius: '4px'
                  }}>
                    {/* Design value */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                        Figma
                      </div>
                      {drift.type === 'color-drift' ? (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: drift.designValue,
                          borderRadius: '4px',
                          margin: '0 auto',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} />
                      ) : (
                        <div style={{ fontWeight: 600 }}>{drift.designValue}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ArrowRight size={24} />
                    </div>

                    {/* Code value */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                        Code
                      </div>
                      {drift.type === 'color-drift' ? (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: drift.codeValue,
                          borderRadius: '4px',
                          margin: '0 auto',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          border: '2px solid #da1e28'
                        }} />
                      ) : (
                        <div style={{ fontWeight: 600, color: '#da1e28' }}>{drift.codeValue}</div>
                      )}
                    </div>
                  </div>

                  <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    {drift.suggestedFix}
                  </p>
                </Tile>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
