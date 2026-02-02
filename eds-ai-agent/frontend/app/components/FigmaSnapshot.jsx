'use client';

import { Tag, Tile } from '@carbon/react';
import { Launch } from '@carbon/icons-react';

// Helper to get doc link based on violation type
const getDocLink = (type) => {
  if (type?.includes('color')) return 'https://carbondesignsystem.com/guidelines/color/usage/';
  if (type?.includes('spacing')) return 'https://carbondesignsystem.com/guidelines/spacing/overview/';
  if (type?.includes('typography')) return 'https://carbondesignsystem.com/guidelines/typography/overview/';
  if (type?.includes('accessibility')) return 'https://carbondesignsystem.com/guidelines/accessibility/overview/';
  return 'https://carbondesignsystem.com/';
};

export default function FigmaSnapshot({ imageUrl, frameName, summary, violations = [] }) {
  return (
    <Tile style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--cds-border-subtle)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

        {/* Left: Snapshot Image */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div
            style={{
              width: '100%',
              background: '#f4f4f4',
              borderRadius: '8px',
              border: '1px solid var(--cds-border-subtle)',
              overflow: 'hidden',
              marginBottom: '12px'
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={frameName || 'Figma frame snapshot'}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: '#8d8d8d' }}>
                No snapshot available
              </div>
            )}
          </div>

          {/* Gauge centered under image? Or maybe put Gauge in the right panel header? Let's put it top right of right panel. */}
        </div>

        {/* Right: Details & Violations */}
        <div style={{ flex: 1, minWidth: '300px' }}>

          {/* Violations List (Replacing Alt Comp/Generic Text) */}
          <div>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--cds-text-primary)',
              borderBottom: '1px solid var(--cds-border-subtle)',
              paddingBottom: '4px'
            }}>
              Violations Found ({violations.length})
            </h5>

            {violations.length === 0 ? (
              <div style={{ color: '#198038', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅</span> No Carbon violations detected!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {violations.map((v, idx) => (
                  <div key={idx} style={{
                    fontSize: '13px',
                    padding: '12px',
                    background: '#ffffff',
                    borderRadius: '4px',
                    border: '1px solid var(--cds-border-subtle)',
                    borderLeft: `4px solid ${v.severity === 'error' ? '#da1e28' : v.severity === 'warning' ? '#f1c21b' : '#4589ff'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--cds-text-primary)' }}>{v.element}</span>
                      <Tag type={v.severity === 'error' ? 'red' : v.severity === 'warning' ? 'yellow' : 'blue'} size="sm">
                        {v.type}
                      </Tag>
                    </div>

                    <p style={{ margin: 0, marginBottom: '8px', color: 'var(--cds-text-primary)' }}>
                      {v.message}
                    </p>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      background: 'var(--cds-layer-01)',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--cds-text-secondary)', marginBottom: '2px' }}>Current</span>
                        <code style={{ fontSize: '12px' }}>{v.current || 'N/A'}</code>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--cds-text-secondary)', marginBottom: '2px' }}>Expected</span>
                        <code style={{ fontSize: '12px', color: '#0f62fe', fontWeight: '600' }}>{v.carbonToken || v.expected}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Tile>
  );
}
