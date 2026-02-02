import { Router } from 'express';
import {
  analyzeFigmaFrame,
  generateCodeFromFigmaUrl,
  compareFigmaToImplementation,
  parseFigmaUrl
} from '../services/figma-service.js';
import { insertFigmaAnalysis, getFigmaAnalysis } from '../database/db.js';

const router = Router();

/**
 * POST /api/figma/analyze
 * Analyze a Figma frame for Carbon compliance
 */
router.post('/analyze', async (req, res) => {
  try {
    const { figmaUrl, force, context } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({ error: 'figmaUrl is required' });
    }

    // Validate URL
    try {
      parseFigmaUrl(figmaUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid Figma URL format' });
    }

    // Check for cached analysis
    const cached = getFigmaAnalysis(figmaUrl);
    if (!force && cached && isRecentAnalysis(cached.analyzed_at)) {
      return res.json({
        ...cached,
        cached: true
      });
    }

    // Analyze the frame
    const result = await analyzeFigmaFrame(figmaUrl, context);

    // Save to database
    if (result.success) {
      insertFigmaAnalysis(
        figmaUrl,
        result.fileKey,
        result.nodeId,
        result.frameName,
        result.complianceScore,
        result.violations,
        null
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error analyzing Figma:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/figma/generate-code
 * Generate Carbon React code from a Figma design
 */
router.post('/generate-code', async (req, res) => {
  try {
    const { figmaUrl } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({ error: 'figmaUrl is required' });
    }

    // Validate URL
    try {
      parseFigmaUrl(figmaUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid Figma URL format' });
    }

    const result = await generateCodeFromFigmaUrl(figmaUrl);
    res.json(result);
  } catch (error) {
    console.error('Error generating code from Figma:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/figma/compare
 * Compare Figma design to code implementation (drift detection)
 */
router.post('/compare', async (req, res) => {
  try {
    const { figmaUrl, code, fileName } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({ error: 'figmaUrl is required' });
    }

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    // Validate URL
    try {
      parseFigmaUrl(figmaUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid Figma URL format' });
    }

    const result = await compareFigmaToImplementation(figmaUrl, code, fileName);
    res.json(result);
  } catch (error) {
    console.error('Error comparing Figma to code:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/figma/history
 * Get analysis history for a Figma URL
 */
router.get('/history', (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    const analysis = getFigmaAnalysis(url);

    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found for this URL' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error getting Figma history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/figma/validate-url
 * Validate a Figma URL
 */
router.post('/validate-url', (req, res) => {
  try {
    const { figmaUrl } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({ error: 'figmaUrl is required' });
    }

    const parsed = parseFigmaUrl(figmaUrl);
    res.json({
      valid: true,
      ...parsed
    });
  } catch (error) {
    res.json({
      valid: false,
      error: error.message
    });
  }
});

// Helper function to check if analysis is recent (within 24 hours)
function isRecentAnalysis(timestamp) {
  if (!timestamp) return false;
  const analysisTime = new Date(timestamp).getTime();
  const now = Date.now();
  const hoursDiff = (now - analysisTime) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

export default router;
