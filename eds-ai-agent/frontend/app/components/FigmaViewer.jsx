'use client';

import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  Button,
  Tag,
  Tile,
  Loading,
  InlineNotification
} from '@carbon/react';
import {
  ZoomIn,
  ZoomOut,
  FitToScreen,
  ColorPalette,
  Rule,
  TextFont,
  Accessibility
} from '@carbon/icons-react';
import ComplianceGauge from './ComplianceGauge';

export default function FigmaViewer({
  figmaUrl,
  imageUrl,
  frameName,
  violations = [],
  designData,
  componentType,
  carbonEquivalent,
  complianceScore,
  onViolationClick,
  isLoading = false
}) {
  const [selectedViolation, setSelectedViolation] = useState(null);

  const handleViolationClick = (violation) => {
    setSelectedViolation(violation);
    if (onViolationClick) {
      onViolationClick(violation);
    }
  };

  const getViolationIcon = (type) => {
    switch (type) {
      case 'color-mismatch':
        return <ColorPalette size={16} />;
      case 'spacing-mismatch':
        return <Rule size={16} />;
      case 'typography-mismatch':
        return <TextFont size={16} />;
      case 'accessibility-issue':
        return <Accessibility size={16} />;
      default:
        return null;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'error':
        return { background: '#fff1f1', borderColor: '#da1e28', color: '#da1e28' };
      case 'warning':
        return { background: '#fdf6dd', borderColor: '#f1c21b', color: '#8a6d0b' };
      case 'info':
        return { background: '#edf5ff', borderColor: '#0f62fe', color: '#0043ce' };
      default:
        return { background: '#f4f4f4', borderColor: '#8d8d8d', color: '#525252' };
    }
  };

  const getComplianceColor = (score) => {
    if (score >= 90) return '#198038';
    if (score >= 70) return '#0f62fe';
    if (score >= 50) return '#f1c21b';
    return '#da1e28';
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
        <Loading description="Analyzing Figma design..." />
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Fetching and analyzing your design...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cds-layer-01)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        background: 'var(--cds-layer-02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{frameName || 'Figma Design'}</h2>
            {componentType && (
              <Tag type="blue" size="sm">
                {componentType} Component
              </Tag>
            )}
          </div>
          <ComplianceGauge value={complianceScore || 0} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Design preview */}
        <div style={{ flex: 1, position: 'relative' }}>
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={3}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  zIndex: 10,
                  display: 'flex',
                  gap: '4px',
                  background: 'var(--cds-layer-02)',
                  padding: '4px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={ZoomOut}
                    iconDescription="Zoom out"
                    onClick={() => zoomOut()}
                  />
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={FitToScreen}
                    iconDescription="Reset zoom"
                    onClick={() => resetTransform()}
                  />
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={ZoomIn}
                    iconDescription="Zoom in"
                    onClick={() => zoomIn()}
                  />
                </div>

                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{
                    padding: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={frameName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          borderRadius: '4px'
                        }}
                      />
                    ) : (
                      /* Placeholder design preview */
                      <div style={{
                        width: designData?.width || 300,
                        height: designData?.height || 200,
                        background: designData?.colors?.[0]?.hex || '#0f62fe',
                        borderRadius: designData?.cornerRadius || 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}>
                        {frameName || 'Design Preview'}
                      </div>
                    )}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>

        {/* Violations sidebar */}
        <div style={{
          width: '350px',
          borderLeft: '1px solid var(--cds-border-subtle)',
          overflow: 'auto',
          background: 'var(--cds-layer-02)'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--cds-border-subtle)'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>
              Design Feedback
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
              {violations.length} items need attention
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            {violations.length === 0 ? (
              <InlineNotification
                kind="success"
                title="All good!"
                subtitle="This design follows Carbon guidelines"
                hideCloseButton
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {violations.map((violation, index) => {
                  const style = getSeverityStyle(violation.severity);
                  const isSelected = selectedViolation === violation;

                  return (
                    <Tile
                      key={index}
                      onClick={() => handleViolationClick(violation)}
                      style={{
                        cursor: 'pointer',
                        borderLeft: `3px solid ${style.borderColor}`,
                        background: isSelected ? style.background : 'var(--cds-layer-01)',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ color: style.color }}>
                          {getViolationIcon(violation.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 500,
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>{violation.element}</span>
                            <Tag type={violation.severity === 'error' ? 'red' : violation.severity === 'warning' ? 'warm-gray' : 'blue'} size="sm">
                              {violation.severity}
                            </Tag>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                            {violation.message}
                          </p>

                          {/* Visual comparison for colors */}
                          {violation.type === 'color-mismatch' && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                background: violation.current,
                                borderRadius: '4px',
                                border: '1px solid var(--cds-border-subtle)'
                              }} />
                              <span style={{ fontSize: '12px' }}>→</span>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                background: violation.expected,
                                borderRadius: '4px',
                                border: '1px solid var(--cds-border-subtle)'
                              }} />
                              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                                {violation.carbonToken}
                              </span>
                            </div>
                          )}

                          {/* Figma action - no code shown */}
                          <div style={{
                            marginTop: '12px',
                            padding: '8px',
                            background: '#edf5ff',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            <strong>Designer Action:</strong><br />
                            Update {violation.element} to {violation.expected}
                          </div>
                        </div>
                      </div>
                    </Tile>
                  );
                })}
              </div>
            )}
          </div>

          {/* Carbon equivalent section */}
          {carbonEquivalent && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--cds-border-subtle)'
            }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>
                Carbon Component
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', marginBottom: '12px' }}>
                This design maps to:
              </p>
              <div style={{
                background: '#262626',
                color: '#f4f4f4',
                padding: '12px',
                borderRadius: '4px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '13px'
              }}>
                {carbonEquivalent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
