'use client';

import { useState } from 'react';
import {
  TextInput,
  Button,
  Loading,
  InlineNotification,
  Tile
} from '@carbon/react';
import { Search, ColorPalette, Rule, TextFont } from '@carbon/icons-react';
import FigmaViewer from '../components/FigmaViewer';
import { analyzeFigma } from '../../lib/api';

export default function DesignerPage() {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    if (!figmaUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeFigma(figmaUrl);
      setAnalysis(result);
    } catch (err) {
      setError(err.message || 'Failed to analyze Figma design');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        background: 'var(--cds-layer-02)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ColorPalette size={32} />
              Designer View
            </h1>
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Analyze Figma designs for Carbon Design System compliance. No code knowledge required.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <TextInput
                id="figma-url"
                labelText="Figma URL"
                placeholder="Paste your Figma frame URL (e.g., https://figma.com/file/...)"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              kind="primary"
              renderIcon={Search}
              onClick={handleAnalyze}
              disabled={loading || !figmaUrl.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze Design'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '16px' }}>
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {loading && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <Loading description="Analyzing your Figma design..." />
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Checking colors, typography, spacing, and accessibility...
            </p>
          </div>
        )}

        {!loading && !analysis && !error && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <ColorPalette size={64} style={{ color: 'var(--cds-text-secondary)', marginBottom: '24px' }} />
              <h2 style={{ marginBottom: '16px' }}>Analyze Your Figma Designs</h2>
              <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '32px' }}>
                Paste a Figma frame URL to check if your design follows Carbon Design System guidelines.
                You'll get visual feedback on colors, spacing, typography, and accessibility.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '32px'
              }}>
                <Tile style={{ padding: '24px', textAlign: 'center' }}>
                  <ColorPalette size={32} style={{ color: '#0f62fe', marginBottom: '12px' }} />
                  <h4>Color Check</h4>
                  <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    Verify colors match Carbon tokens
                  </p>
                </Tile>
                <Tile style={{ padding: '24px', textAlign: 'center' }}>
                  <Rule size={32} style={{ color: '#0f62fe', marginBottom: '12px' }} />
                  <h4>Spacing Check</h4>
                  <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    Ensure spacing follows Carbon scale
                  </p>
                </Tile>
                <Tile style={{ padding: '24px', textAlign: 'center' }}>
                  <TextFont size={32} style={{ color: '#0f62fe', marginBottom: '12px' }} />
                  <h4>Typography Check</h4>
                  <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    Validate fonts and text styles
                  </p>
                </Tile>
              </div>
            </div>
          </div>
        )}

        {!loading && analysis && (
          <FigmaViewer
            figmaUrl={analysis.figmaUrl}
            imageUrl={analysis.imageUrl}
            frameName={analysis.frameName}
            violations={analysis.violations}
            designData={analysis.designData}
            componentType={analysis.componentType}
            carbonEquivalent={analysis.carbonEquivalent}
            complianceScore={analysis.complianceScore}
          />
        )}
      </div>
    </div>
  );
}
