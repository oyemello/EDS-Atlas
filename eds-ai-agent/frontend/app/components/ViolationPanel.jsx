'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Tag,
  Accordion,
  AccordionItem,
  Loading,
  CodeSnippet,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@carbon/react';
import {
  Close,
  Checkmark,
  View,
  Copy,
  ArrowRight,
  DocumentBlank,
  ColorPalette
} from '@carbon/icons-react';
import { generateFix } from '../../lib/api';

export default function ViolationPanel({
  violations = [],
  selectedViolation,
  code,
  onViolationSelect,
  onApplyFix,
  onClose
}) {
  const [loadingFix, setLoadingFix] = useState(false);
  const [fixedCode, setFixedCode] = useState(null);
  const [fixExplanation, setFixExplanation] = useState('');

  useEffect(() => {
    if (selectedViolation) {
      loadFix(selectedViolation);
    }
  }, [selectedViolation]);

  const loadFix = async (violation) => {
    setLoadingFix(true);
    setFixedCode(null);

    try {
      const result = await generateFix(violation, code);
      setFixedCode(result.fixedCode);
      setFixExplanation(result.explanation);
    } catch (error) {
      console.error('Failed to generate fix:', error);
      // Use suggested fix from violation
      setFixedCode(violation.suggestedFix);
      setFixExplanation('Use the suggested Carbon token or component');
    } finally {
      setLoadingFix(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'warm-gray';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const groupedViolations = violations.reduce((acc, v) => {
    const type = v.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(v);
    return acc;
  }, {});

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600 }}>
          Violations ({violations.length})
        </span>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={Close}
          iconDescription="Close panel"
          onClick={onClose}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedViolation ? (
          /* Violation Detail View */
          <div style={{ padding: '16px' }}>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onViolationSelect(null)}
              style={{ marginBottom: '16px' }}
            >
              ← Back to list
            </Button>

            <div style={{
              background: 'var(--cds-layer-02)',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Tag type={getSeverityColor(selectedViolation.severity)} size="sm">
                  {selectedViolation.severity}
                </Tag>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  Line {selectedViolation.line}
                </span>
              </div>

              <h4 style={{ marginBottom: '8px' }}>{selectedViolation.type}</h4>
              <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '16px' }}>
                {selectedViolation.message}
              </p>

              {selectedViolation.carbonToken && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                    Carbon Token:
                  </span>
                  <CodeSnippet type="inline">
                    {selectedViolation.carbonToken}
                  </CodeSnippet>
                </div>
              )}

              {selectedViolation.carbonComponent && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                    Carbon Component:
                  </span>
                  <CodeSnippet type="inline">
                    {selectedViolation.carbonComponent}
                  </CodeSnippet>
                </div>
              )}
            </div>

            {/* Before/After Comparison */}
            <Tabs>
              <TabList aria-label="Code comparison">
                <Tab>Before</Tab>
                <Tab>After (Fix)</Tab>
                <Tab>Visual</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <div style={{ marginTop: '12px' }}>
                    <CodeSnippet type="multi" feedback="Copied!">
                      {selectedViolation.code || 'No code snippet available'}
                    </CodeSnippet>
                  </div>
                </TabPanel>
                <TabPanel>
                  <div style={{ marginTop: '12px' }}>
                    {loadingFix ? (
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <Loading small withOverlay={false} description="Generating fix..." />
                      </div>
                    ) : (
                      <>
                        <CodeSnippet type="multi" feedback="Copied!">
                          {fixedCode || selectedViolation.suggestedFix || 'No fix available'}
                        </CodeSnippet>
                        {fixExplanation && (
                          <p style={{
                            marginTop: '12px',
                            fontSize: '13px',
                            color: 'var(--cds-text-secondary)'
                          }}>
                            💡 {fixExplanation}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </TabPanel>
                <TabPanel>
                  <div style={{ marginTop: '12px' }}>
                    {/* Visual comparison for color violations */}
                    {selectedViolation.type === 'hardcoded-color' && (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Current</div>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            background: selectedViolation.code,
                            borderRadius: '4px',
                            border: '1px solid var(--cds-border-subtle)'
                          }} />
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>
                            {selectedViolation.code}
                          </div>
                        </div>
                        <ArrowRight size={20} />
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Carbon</div>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            background: '#0f62fe',
                            borderRadius: '4px',
                            border: '1px solid var(--cds-border-subtle)'
                          }} />
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>
                            {selectedViolation.carbonToken}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Spacing comparison */}
                    {selectedViolation.type === 'hardcoded-spacing' && (
                      <div>
                        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                          Spacing Comparison
                        </div>
                        <div style={{ display: 'flex', gap: '24px' }}>
                          <div>
                            <div style={{ fontSize: '11px', marginBottom: '4px' }}>Current</div>
                            <div style={{
                              width: selectedViolation.code,
                              height: '24px',
                              background: '#da1e28',
                              borderRadius: '2px'
                            }} />
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                              {selectedViolation.code}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', marginBottom: '4px' }}>Carbon</div>
                            <div style={{
                              width: '16px',
                              height: '24px',
                              background: '#198038',
                              borderRadius: '2px'
                            }} />
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                              {selectedViolation.carbonToken}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!['hardcoded-color', 'hardcoded-spacing'].includes(selectedViolation.type) && (
                      <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>
                        Visual comparison not available for this violation type.
                      </p>
                    )}
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Action buttons */}
            <div style={{
              marginTop: '24px',
              display: 'flex',
              gap: '8px'
            }}>
              <Button
                kind="primary"
                size="md"
                renderIcon={Checkmark}
                disabled={loadingFix || !fixedCode}
                onClick={() => onApplyFix && onApplyFix(selectedViolation, fixedCode)}
              >
                Apply Fix
              </Button>
              <Button
                kind="secondary"
                size="md"
                renderIcon={View}
                onClick={() => onViolationSelect(null)}
              >
                Preview
              </Button>
            </div>
          </div>
        ) : (
          /* Violation List View */
          <div style={{ padding: '8px' }}>
            <Accordion align="start">
              {Object.entries(groupedViolations).map(([type, items]) => (
                <AccordionItem
                  key={type}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{type}</span>
                      <Tag type="gray" size="sm">{items.length}</Tag>
                    </div>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map((violation, index) => (
                      <div
                        key={index}
                        onClick={() => onViolationSelect(violation)}
                        style={{
                          padding: '12px',
                          background: 'var(--cds-layer-02)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          borderLeft: `3px solid ${violation.severity === 'error' ? '#da1e28' : violation.severity === 'warning' ? '#f1c21b' : '#0f62fe'}`,
                          transition: 'background 0.1s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cds-layer-01)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--cds-layer-02)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            {getSeverityIcon(violation.severity)} Line {violation.line}
                          </span>
                          <ArrowRight size={16} />
                        </div>
                        <p style={{
                          fontSize: '12px',
                          color: 'var(--cds-text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {violation.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--cds-border-subtle)',
        fontSize: '12px',
        color: 'var(--cds-text-secondary)'
      }}>
        💡 Click a violation to see details and fixes
      </div>
    </div>
  );
}
