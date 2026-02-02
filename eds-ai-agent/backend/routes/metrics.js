import { Router } from 'express';
import {
  getRepoMetrics,
  getRepoSnapshots,
  getRepoById,
  getAllRepositories,
  getRepoFileCompliance
} from '../database/db.js';

const router = Router();

/**
 * GET /api/metrics/:repoId
 * Get compliance metrics for a repository
 */
router.get('/:repoId', (req, res) => {
  try {
    const { repoId } = req.params;

    const metrics = getRepoMetrics(parseInt(repoId));

    if (!metrics) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/:repoId/trend
 * Get compliance trend over time
 */
router.get('/:repoId/trend', (req, res) => {
  try {
    const { repoId } = req.params;
    const { days = 30 } = req.query;

    const snapshots = getRepoSnapshots(parseInt(repoId), parseInt(days));

    if (!snapshots || snapshots.length === 0) {
      return res.status(404).json({ error: 'No snapshots found' });
    }

    // Format for charting
    const trend = snapshots.map(s => ({
      date: s.timestamp,
      compliance: s.overall_compliance_score,
      totalViolations: s.total_violations,
      critical: s.critical_violations,
      warnings: s.warnings
    }));

    res.json(trend);
  } catch (error) {
    console.error('Error getting trend:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/:repoId/files
 * Get file-level compliance data
 */
router.get('/:repoId/files', (req, res) => {
  try {
    const { repoId } = req.params;
    const { sortBy = 'compliance', limit = 50 } = req.query;

    const files = getRepoFileCompliance(parseInt(repoId));

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'No file data found' });
    }

    // Sort files
    let sortedFiles = [...files];
    if (sortBy === 'compliance') {
      sortedFiles.sort((a, b) => a.compliance_score - b.compliance_score);
    } else if (sortBy === 'violations') {
      sortedFiles.sort((a, b) => b.violations.length - a.violations.length);
    }

    res.json(sortedFiles.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error getting file metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/weekly/:repoId
 * Generate a weekly compliance report
 */
router.get('/reports/weekly/:repoId', (req, res) => {
  try {
    const { repoId } = req.params;

    const repo = getRepoById(parseInt(repoId));
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const snapshots = getRepoSnapshots(parseInt(repoId), 7);
    const files = getRepoFileCompliance(parseInt(repoId));

    if (!snapshots || snapshots.length === 0) {
      return res.status(404).json({ error: 'No data for weekly report' });
    }

    // Calculate week-over-week changes
    const latestSnapshot = snapshots[0];
    const oldestSnapshot = snapshots[snapshots.length - 1];

    const complianceChange = latestSnapshot.overall_compliance_score - oldestSnapshot.overall_compliance_score;
    const violationsChange = latestSnapshot.total_violations - oldestSnapshot.total_violations;

    // Get top issues
    const allViolations = [];
    files.forEach(file => {
      file.violations.forEach(v => {
        allViolations.push({
          ...v,
          file: file.file_path
        });
      });
    });

    // Group by type
    const violationsByType = {};
    allViolations.forEach(v => {
      const type = v.type || 'unknown';
      if (!violationsByType[type]) {
        violationsByType[type] = [];
      }
      violationsByType[type].push(v);
    });

    // Top 5 issue types
    const topIssueTypes = Object.entries(violationsByType)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([type, items]) => ({
        type,
        count: items.length,
        severity: items[0]?.severity || 'warning'
      }));

    // Top 5 problematic files
    const topProblematicFiles = files
      .sort((a, b) => b.violations.length - a.violations.length)
      .slice(0, 5)
      .map(f => ({
        path: f.file_path,
        violations: f.violations.length,
        compliance: f.compliance_score
      }));

    const report = {
      repository: repo.repo_name,
      period: {
        start: oldestSnapshot.timestamp,
        end: latestSnapshot.timestamp
      },
      summary: {
        currentCompliance: latestSnapshot.overall_compliance_score,
        complianceChange,
        complianceTrend: complianceChange > 0 ? 'improving' : complianceChange < 0 ? 'declining' : 'stable',
        totalViolations: latestSnapshot.total_violations,
        violationsChange,
        criticalViolations: latestSnapshot.critical_violations,
        warnings: latestSnapshot.warnings
      },
      topIssueTypes,
      topProblematicFiles,
      recommendations: generateRecommendations(topIssueTypes, complianceChange),
      generatedAt: new Date().toISOString()
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/overview
 * Get overview of all repositories
 */
router.get('/', (req, res) => {
  try {
    const repos = getAllRepositories();

    const overview = repos.map(repo => {
      const metrics = getRepoMetrics(repo.id);
      return {
        id: repo.id,
        name: repo.repo_name,
        url: repo.repo_url,
        lastAnalyzed: repo.last_analyzed,
        compliance: metrics?.latestSnapshot?.overall_compliance_score || 0,
        totalViolations: metrics?.latestSnapshot?.total_violations || 0,
        critical: metrics?.latestSnapshot?.critical_violations || 0
      };
    });

    res.json({
      totalRepositories: repos.length,
      repositories: overview,
      averageCompliance: overview.length > 0
        ? Math.round(overview.reduce((sum, r) => sum + r.compliance, 0) / overview.length)
        : 0
    });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(topIssueTypes, complianceChange) {
  const recommendations = [];

  topIssueTypes.forEach(issue => {
    switch (issue.type) {
      case 'hardcoded-color':
        recommendations.push({
          priority: 'high',
          action: 'Create a centralized theme using Carbon color tokens',
          impact: `Will fix ${issue.count} color violations`
        });
        break;
      case 'hardcoded-spacing':
        recommendations.push({
          priority: 'medium',
          action: 'Replace hardcoded spacing with Carbon spacing tokens',
          impact: `Will fix ${issue.count} spacing violations`
        });
        break;
      case 'custom-component':
        recommendations.push({
          priority: 'high',
          action: 'Migrate custom components to Carbon equivalents',
          impact: `Will improve consistency and accessibility for ${issue.count} components`
        });
        break;
      case 'accessibility-violation':
        recommendations.push({
          priority: 'critical',
          action: 'Address accessibility issues immediately',
          impact: `${issue.count} accessibility issues affecting users`
        });
        break;
    }
  });

  if (complianceChange < -5) {
    recommendations.unshift({
      priority: 'critical',
      action: 'Compliance is declining. Consider adding pre-commit hooks for Carbon linting.',
      impact: 'Prevent future violations from being introduced'
    });
  }

  return recommendations.slice(0, 5);
}

export default router;
