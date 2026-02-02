'use client';

import { useState, useEffect } from 'react';
import {
  Dropdown
} from '@carbon/react';
import Dashboard from '../components/Dashboard';
import { getMetricsOverview } from '../../lib/api';

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const overview = await getMetricsOverview();
      setRepos(overview.repositories || []);
      if (overview.repositories?.length > 0) {
        setSelectedRepo(overview.repositories[0]);
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header controls */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--cds-border-subtle)',
        background: 'var(--cds-layer-02)',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}>
        {repos.length > 1 && (
          <Dropdown
            id="repo-select"
            titleText="Repository"
            label="Select repository"
            items={repos}
            itemToString={(item) => item?.name || ''}
            selectedItem={selectedRepo}
            onChange={({ selectedItem }) => setSelectedRepo(selectedItem)}
            size="sm"
            style={{ minWidth: '200px' }}
          />
        )}
      </div>

      {/* Dashboard content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Dashboard
          repoId={selectedRepo?.id}
          metrics={null}
        />
      </div>
    </div>
  );
}
