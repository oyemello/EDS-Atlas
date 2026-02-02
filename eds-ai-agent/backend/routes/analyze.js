import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  analyzeRepository,
  analyzeFile,
  getAnalysisStatus,
  getAnalysisResults
} from '../services/repo-analyzer.js';
import { suggestFix } from '../services/openai-service.js';

const router = Router();

// Store for in-progress analyses
const analysisProgress = new Map();

/**
 * POST /api/analyze/repo
 * Start repository analysis
 */
router.post('/repo', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Validate URL format
    if (!repoUrl.includes('github.com') && !repoUrl.match(/^[^\/]+\/[^\/]+$/)) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const analysisId = uuidv4();

    // Initialize progress tracking
    analysisProgress.set(analysisId, {
      status: 'starting',
      progress: 0,
      message: 'Starting analysis...'
    });

    // Start analysis in background
    analyzeRepository(repoUrl, {
      jobId: analysisId,
      onProgress: (progress) => {
        analysisProgress.set(analysisId, progress);
      }
    }).catch(error => {
      analysisProgress.set(analysisId, {
        status: 'error',
        error: error.message,
        progress: 0
      });
    });

    res.json({
      analysisId,
      status: 'started',
      message: 'Analysis started. Poll /api/analyze/status/:id for progress.'
    });
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analyze/status/:id
 * Get analysis status
 */
router.get('/status/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check in-memory progress first
    const progress = analysisProgress.get(id);
    if (progress) {
      return res.json(progress);
    }

    // Fall back to database
    const status = getAnalysisStatus(id);
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analyze/results/:id
 * Get analysis results
 */
router.get('/results/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check in-memory progress first
    const progress = analysisProgress.get(id);
    if (progress && progress.results) {
      // Cleanup progress tracking after returning results
      analysisProgress.delete(id);
      return res.json(progress.results);
    }

    // Fall back to database
    const results = getAnalysisResults(id);

    if (results.error) {
      return res.status(404).json(results);
    }

    res.json(results);
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analyze/file
 * Analyze a single file
 */
router.post('/file', async (req, res) => {
  try {
    const { code, fileName } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const result = await analyzeFile(code, fileName || 'component.jsx');
    res.json(result);
  } catch (error) {
    console.error('Error analyzing file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analyze/fix
 * Generate a fix for a violation
 */
router.post('/fix', async (req, res) => {
  try {
    const { violation, code, context } = req.body;

    if (!violation || !code) {
      return res.status(400).json({ error: 'violation and code are required' });
    }

    const fix = await suggestFix(violation, code, context);
    res.json(fix);
  } catch (error) {
    console.error('Error generating fix:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analyze/batch
 * Analyze multiple files at once
 */
router.post('/batch', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const results = await Promise.all(
      files.map(file => analyzeFile(file.code, file.fileName))
    );

    // Calculate aggregate stats
    let totalViolations = 0;
    let criticalViolations = 0;
    let warnings = 0;
    let totalScore = 0;

    results.forEach(result => {
      if (result.success) {
        totalViolations += result.violations?.length || 0;
        criticalViolations += result.violations?.filter(v => v.severity === 'error').length || 0;
        warnings += result.violations?.filter(v => v.severity === 'warning').length || 0;
        totalScore += result.complianceScore || 0;
      }
    });

    res.json({
      files: results,
      summary: {
        totalFiles: files.length,
        totalViolations,
        criticalViolations,
        warnings,
        averageCompliance: Math.round(totalScore / results.filter(r => r.success).length) || 0
      }
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
