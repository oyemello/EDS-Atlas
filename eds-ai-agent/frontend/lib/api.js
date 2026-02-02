import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5 minutes for complex Figma analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry logic with exponential backoff
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.response && error.response.status < 500) {
        throw error;
      }
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Health check
export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

// Repository Analysis
export async function startRepoAnalysis(repoUrl) {
  const response = await api.post('/analyze/repo', { repoUrl });
  return response.data;
}

export async function getAnalysisStatus(analysisId) {
  const response = await api.get(`/analyze/status/${analysisId}`);
  return response.data;
}

export async function getAnalysisResults(analysisId) {
  const response = await api.get(`/analyze/results/${analysisId}`);
  return response.data;
}

export async function analyzeFile(code, fileName = 'component.jsx') {
  const response = await api.post('/analyze/file', { code, fileName });
  return response.data;
}

export async function generateFix(violation, code, context = '') {
  const response = await api.post('/analyze/fix', { violation, code, context });
  return response.data;
}

// Figma Analysis
export async function analyzeFigma(figmaUrl, context = '') {
  const response = await api.post('/figma/analyze', { figmaUrl, context, force: true });
  return response.data;
}

export async function generateCodeFromFigma(figmaUrl) {
  const response = await api.post('/figma/generate-code', { figmaUrl });
  return response.data;
}

export async function compareFigmaToCode(figmaUrl, code, fileName = 'component.jsx') {
  const response = await api.post('/figma/compare', { figmaUrl, code, fileName });
  return response.data;
}

// General chat
export async function chat(message, context = '') {
  const response = await api.post('/chat', { message, context });
  return response.data;
}

export async function clearChatHistory() {
  const response = await api.delete('/chat/history');
  return response.data;
}

export async function validateFigmaUrl(figmaUrl) {
  const response = await api.post('/figma/validate-url', { figmaUrl });
  return response.data;
}

// Metrics
export async function getRepoMetrics(repoId) {
  const response = await api.get(`/metrics/${repoId}`);
  return response.data;
}

export async function getComplianceTrend(repoId, days = 30) {
  const response = await api.get(`/metrics/${repoId}/trend`, { params: { days } });
  return response.data;
}

export async function getWeeklyReport(repoId) {
  const response = await api.get(`/metrics/reports/weekly/${repoId}`);
  return response.data;
}

export async function getMetricsOverview() {
  const response = await api.get('/metrics');
  return response.data;
}

// Carbon Design System data
export async function getCarbonTokens() {
  const response = await api.get('/carbon/tokens');
  return response.data;
}

export async function getCarbonComponents() {
  const response = await api.get('/carbon/components');
  return response.data;
}

// Poll for analysis completion
export async function pollAnalysis(analysisId, onProgress, interval = 1000) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getAnalysisStatus(analysisId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'complete') {
          const results = await getAnalysisResults(analysisId);
          resolve(results);
        } else if (status.status === 'error') {
          reject(new Error(status.error || 'Analysis failed'));
        } else {
          setTimeout(poll, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

// Detect URL type
export function detectUrlType(url) {
  if (!url) return null;

  const trimmed = url.trim();

  // Try robust URL parsing first
  try {
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('github.com')) return 'github';
    if (host.includes('figma.com')) return 'figma';
  } catch (_) {
    // fall through to simple checks
  }

  // Fallback heuristics
  if (trimmed.toLowerCase().includes('github.com') || trimmed.match(/^[^\/]+\/[^\/]+$/)) {
    return 'github';
  }
  if (trimmed.toLowerCase().includes('figma.com')) {
    return 'figma';
  }
  return null;
}

export default api;
