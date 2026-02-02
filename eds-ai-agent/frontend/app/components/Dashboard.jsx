'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Tile,
  ClickableTile,
  Tag,
  Loading,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell
} from '@carbon/react';
import {
  Analytics,
  Warning,
  Checkmark,
  DocumentBlank,
  ArrowUp,
  ArrowDown,
  Renew
} from '@carbon/icons-react';
const COLORS = ['#da1e28', '#f1c21b', '#0f62fe', '#198038', '#8a3ffc', '#1192e8'];

export default function Dashboard({
  repoId,
  metrics: propMetrics
}) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, [repoId, propMetrics]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/metrics/${repoId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setError(error.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Loading description="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <Warning size={24} style={{ color: '#da1e28' }} />
          <h2 style={{ margin: 0, color: '#da1e28' }}>Error Loading Dashboard</h2>
        </div>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '24px' }}>
          {error}
        </p>
        <Button onClick={loadMetrics}>Try Again</Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>No metrics data available. Analyze a repository first.</p>
      </div>
    );
  }

  const latestSnapshot = metrics.latestSnapshot || {};
  const complianceScore = latestSnapshot.overall_compliance_score || 0;

  // Prepare chart data
  const trendData = (metrics.complianceTrend || []).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    compliance: item.compliance,
    violations: item.totalViolations
  }));

  const violationData = Object.entries(metrics.violationBreakdown || {}).map(([name, value]) => ({
    name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  const topFilesData = (metrics.topViolatingFiles || []).slice(0, 5).map(file => ({
    name: file.filePath.split('/').pop(),
    fullPath: file.filePath,
    violations: file.violations,
    compliance: file.complianceScore
  }));

  const getComplianceColor = (score) => {
    if (score >= 90) return '#198038';
    if (score >= 70) return '#0f62fe';
    if (score >= 50) return '#f1c21b';
    return '#da1e28';
  };

  const getComplianceStatus = (score) => {
    if (score >= 90) return { text: 'Excellent', icon: <Checkmark size={16} /> };
    if (score >= 70) return { text: 'Good', icon: <Checkmark size={16} /> };
    if (score >= 50) return { text: 'Needs Work', icon: <Warning size={16} /> };
    return { text: 'Critical', icon: <Warning size={16} /> };
  };

  const status = getComplianceStatus(complianceScore);

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            Compliance Dashboard
          </h1>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            {metrics.repository?.repo_name || 'Repository Overview'}
          </p>
        </div>
        <Button
          kind="tertiary"
          renderIcon={Renew}
          onClick={loadMetrics}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Compliance Score Card */}
        <Tile style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                Compliance Score
              </p>
              <p style={{
                fontSize: '48px',
                fontWeight: 600,
                color: getComplianceColor(complianceScore)
              }}>
                {complianceScore}%
              </p>
            </div>
            <Tag type={complianceScore >= 70 ? 'green' : complianceScore >= 50 ? 'warm-gray' : 'red'}>
              {status.icon} {status.text}
            </Tag>
          </div>
        </Tile>

        {/* Total Violations Card */}
        <Tile style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
            Total Violations
          </p>
          <p style={{ fontSize: '48px', fontWeight: 600 }}>
            {latestSnapshot.total_violations || 0}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Tag type="red" size="sm">
              {latestSnapshot.critical_violations || 0} Critical
            </Tag>
            <Tag type="warm-gray" size="sm">
              {latestSnapshot.warnings || 0} Warnings
            </Tag>
          </div>
        </Tile>

        {/* Files Analyzed Card */}
        <Tile style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
            Files Analyzed
          </p>
          <p style={{ fontSize: '48px', fontWeight: 600 }}>
            {metrics.repository?.total_files || 0}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginTop: '8px' }}>
            Last analyzed: {metrics.repository?.last_analyzed
              ? new Date(metrics.repository.last_analyzed).toLocaleDateString()
              : 'Never'}
          </p>
        </Tile>

        {/* Trend Card */}
        <Tile style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
            7-Day Trend
          </p>
          {trendData.length >= 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {trendData[trendData.length - 1]?.compliance > trendData[0]?.compliance ? (
                  <>
                    <ArrowUp size={24} style={{ color: '#198038' }} />
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#198038' }}>
                      +{trendData[trendData.length - 1].compliance - trendData[0].compliance}%
                    </span>
                  </>
                ) : trendData[trendData.length - 1]?.compliance < trendData[0]?.compliance ? (
                  <>
                    <ArrowDown size={24} style={{ color: '#da1e28' }} />
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#da1e28' }}>
                      {trendData[trendData.length - 1].compliance - trendData[0].compliance}%
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '24px', fontWeight: 600 }}>No change</span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginTop: '8px' }}>
                Compared to last week
              </p>
            </>
          )}
        </Tile>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Compliance Trend Chart */}
        <Tile style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Compliance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
              <XAxis
                dataKey="date"
                stroke="var(--cds-text-secondary)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--cds-text-secondary)"
                fontSize={12}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--cds-layer-02)',
                  border: '1px solid var(--cds-border-subtle)',
                  borderRadius: '4px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="compliance"
                name="Compliance %"
                stroke="#0f62fe"
                strokeWidth={2}
                dot={{ fill: '#0f62fe' }}
              />
              <Line
                type="monotone"
                dataKey="violations"
                name="Violations"
                stroke="#da1e28"
                strokeWidth={2}
                dot={{ fill: '#da1e28' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Tile>

        {/* Violation Breakdown Pie Chart */}
        <Tile style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Violation Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={violationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {violationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Tile>
      </div>

      {/* Bottom Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {/* Top Violating Files */}
        <Tile style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Top Violating Files</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topFilesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
              <XAxis type="number" stroke="var(--cds-text-secondary)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--cds-text-secondary)"
                fontSize={12}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--cds-layer-02)',
                  border: '1px solid var(--cds-border-subtle)',
                  borderRadius: '4px'
                }}
                formatter={(value, name, props) => [
                  value,
                  name === 'violations' ? 'Violations' : 'Compliance'
                ]}
              />
              <Bar dataKey="violations" fill="#da1e28" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Tile>

        {/* Recent PR Reviews */}
        <Tile style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Recent PR Reviews</h3>
          {metrics.recentPRReviews && metrics.recentPRReviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {metrics.recentPRReviews.map((pr, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'var(--cds-layer-01)',
                    borderRadius: '4px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>PR #{pr.pr_number}</span>
                    <p style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                      {new Date(pr.reviewed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 600,
                        color: getComplianceColor(pr.compliance_score)
                      }}>
                        {pr.compliance_score}%
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                        {pr.violations_found} violations
                      </p>
                    </div>
                    <Tag type={pr.compliance_score >= 80 ? 'green' : pr.compliance_score >= 60 ? 'warm-gray' : 'red'} size="sm">
                      {pr.compliance_score >= 80 ? 'Pass' : pr.compliance_score >= 60 ? 'Review' : 'Fail'}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--cds-text-secondary)', textAlign: 'center', padding: '24px' }}>
              No PR reviews yet
            </p>
          )}
        </Tile>
      </div>
    </div>
  );
}
