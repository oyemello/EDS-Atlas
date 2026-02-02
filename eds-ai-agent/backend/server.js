import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Import routes
import analyzeRoutes from './routes/analyze.js';
import figmaRoutes from './routes/figma.js';
import metricsRoutes from './routes/metrics.js';
import chatRoutes from './routes/chat.js';

// Import database to ensure initialization
import './database/db.js';

// Import Carbon data
import { carbonTokens, carbonComponents } from './services/openai-service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Security Middleware: API Key check (for Custom GPT safety)
app.use((req, res, next) => {
  // Allow health check and static assets without key
  if (req.path === '/api/health' || req.method === 'OPTIONS') {
    return next();
  }

  // If secured mode is enabled
  const apiSecret = process.env.API_SECRET;
  if (apiSecret) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== apiSecret) {
      console.warn(`Unauthorized access attempt from ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
      figma: !!process.env.FIGMA_ACCESS_TOKEN
    }
  });
});

// Carbon Design System data endpoints
app.get('/api/carbon/tokens', (req, res) => {
  res.json(carbonTokens);
});

app.get('/api/carbon/components', (req, res) => {
  res.json(carbonComponents);
});

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/figma', figmaRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███████╗██████╗ ███████╗     █████╗ ████████╗██╗      █████╗ ███████╗ ║
║   ██╔════╝██╔══██╗██╔════╝    ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝ ║
║   █████╗  ██║  ██║███████╗    ███████║   ██║   ██║     ███████║███████╗ ║
║   ██╔══╝  ██║  ██║╚════██║    ██╔══██║   ██║   ██║     ██╔══██║╚════██║ ║
║   ███████╗██████╔╝███████║    ██║  ██║   ██║   ███████╗██║  ██║███████║ ║
║   ╚══════╝╚═════╝ ╚══════╝    ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝ ║
║                                                               ║
║   AI-Powered Design System Code Inspector                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Server running at http://localhost:${PORT}

📊 API Endpoints:
   POST /api/analyze/repo     - Analyze a GitHub repository
   POST /api/analyze/file     - Analyze a single file
   POST /api/figma/analyze    - Analyze a Figma design
   POST /api/figma/compare    - Compare Figma to code (drift)
   GET  /api/metrics/:repoId  - Get compliance metrics
   GET  /api/health           - Health check

🔧 Services:
   OpenAI API: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured (using mock mode)'}
   GitHub:     ${process.env.GITHUB_TOKEN ? '✓ Configured' : '✗ Not configured'}
   Figma:      ${process.env.FIGMA_ACCESS_TOKEN ? '✓ Configured' : '✗ Not configured (using mock mode)'}
  `);
});

export default app;
