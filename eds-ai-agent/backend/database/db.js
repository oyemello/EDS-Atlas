import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from env or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
function initializeDatabase() {
  // Repositories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_url TEXT UNIQUE NOT NULL,
      repo_name TEXT NOT NULL,
      last_analyzed DATETIME,
      total_files INTEGER DEFAULT 0,
      total_components INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Repository snapshots table (for tracking compliance over time)
  db.exec(`
    CREATE TABLE IF NOT EXISTS repo_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      overall_compliance_score REAL DEFAULT 0,
      total_violations INTEGER DEFAULT 0,
      critical_violations INTEGER DEFAULT 0,
      warnings INTEGER DEFAULT 0,
      FOREIGN KEY (repo_id) REFERENCES repositories(id)
    )
  `);

  // File compliance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_compliance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      compliance_score REAL DEFAULT 0,
      violations_json TEXT DEFAULT '[]',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repo_id) REFERENCES repositories(id),
      UNIQUE(repo_id, file_path)
    )
  `);

  // PR reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pr_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      pr_number INTEGER NOT NULL,
      pr_url TEXT,
      compliance_score REAL DEFAULT 0,
      violations_found INTEGER DEFAULT 0,
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repo_id) REFERENCES repositories(id)
    )
  `);

  // Analysis jobs table (for tracking async analysis)
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id TEXT PRIMARY KEY,
      repo_id INTEGER,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      total_files INTEGER DEFAULT 0,
      analyzed_files INTEGER DEFAULT 0,
      results_json TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repo_id) REFERENCES repositories(id)
    )
  `);

  // Figma analyses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS figma_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      figma_url TEXT NOT NULL,
      file_key TEXT,
      node_id TEXT,
      frame_name TEXT,
      compliance_score REAL DEFAULT 0,
      violations_json TEXT DEFAULT '[]',
      generated_code TEXT,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      meta_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

// Repository methods
function insertRepo(repoUrl, repoName) {
  const stmt = db.prepare(`
    INSERT INTO repositories (repo_url, repo_name)
    VALUES (?, ?)
    ON CONFLICT(repo_url) DO UPDATE SET
      repo_name = excluded.repo_name
  `);
  const result = stmt.run(repoUrl, repoName);
  return getRepoByUrl(repoUrl);
}

function getRepoByUrl(repoUrl) {
  const stmt = db.prepare('SELECT * FROM repositories WHERE repo_url = ?');
  return stmt.get(repoUrl);
}

function getRepoById(id) {
  const stmt = db.prepare('SELECT * FROM repositories WHERE id = ?');
  return stmt.get(id);
}

function updateRepoStats(repoId, totalFiles, totalComponents) {
  const stmt = db.prepare(`
    UPDATE repositories
    SET total_files = ?, total_components = ?, last_analyzed = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(totalFiles, totalComponents, repoId);
}

// Snapshot methods
function insertSnapshot(repoId, overallScore, totalViolations, criticalViolations, warnings) {
  const stmt = db.prepare(`
    INSERT INTO repo_snapshots (repo_id, overall_compliance_score, total_violations, critical_violations, warnings)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(repoId, overallScore, totalViolations, criticalViolations, warnings);
}

function getRepoSnapshots(repoId, limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM repo_snapshots
    WHERE repo_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(repoId, limit);
}

// File compliance methods
function insertFileCompliance(repoId, filePath, complianceScore, violations) {
  const stmt = db.prepare(`
    INSERT INTO file_compliance (repo_id, file_path, compliance_score, violations_json, last_updated)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(repo_id, file_path) DO UPDATE SET
      compliance_score = excluded.compliance_score,
      violations_json = excluded.violations_json,
      last_updated = CURRENT_TIMESTAMP
  `);
  return stmt.run(repoId, filePath, complianceScore, JSON.stringify(violations));
}

function getFileCompliance(repoId, filePath) {
  const stmt = db.prepare(`
    SELECT * FROM file_compliance
    WHERE repo_id = ? AND file_path = ?
  `);
  const result = stmt.get(repoId, filePath);
  if (result) {
    result.violations = JSON.parse(result.violations_json);
  }
  return result;
}

function getRepoFileCompliance(repoId) {
  const stmt = db.prepare(`
    SELECT * FROM file_compliance
    WHERE repo_id = ?
    ORDER BY compliance_score ASC
  `);
  const results = stmt.all(repoId);
  return results.map(r => ({
    ...r,
    violations: JSON.parse(r.violations_json)
  }));
}

// Analysis job methods
function createAnalysisJob(jobId, repoId = null) {
  const stmt = db.prepare(`
    INSERT INTO analysis_jobs (id, repo_id, status, progress)
    VALUES (?, ?, 'pending', 0)
  `);
  stmt.run(jobId, repoId);
  return jobId;
}

function updateAnalysisJob(jobId, updates) {
  const allowedFields = ['status', 'progress', 'total_files', 'analyzed_files', 'results_json', 'error', 'repo_id'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      values.push(key === 'results_json' ? JSON.stringify(value) : value);
    }
  }

  if (setClause.length === 0) return;

  setClause.push('updated_at = CURRENT_TIMESTAMP');
  values.push(jobId);

  const stmt = db.prepare(`
    UPDATE analysis_jobs
    SET ${setClause.join(', ')}
    WHERE id = ?
  `);
  return stmt.run(...values);
}

function getAnalysisJob(jobId) {
  const stmt = db.prepare('SELECT * FROM analysis_jobs WHERE id = ?');
  const result = stmt.get(jobId);
  if (result && result.results_json) {
    result.results = JSON.parse(result.results_json);
  }
  return result;
}

// PR review methods
function insertPRReview(repoId, prNumber, prUrl, complianceScore, violationsFound) {
  const stmt = db.prepare(`
    INSERT INTO pr_reviews (repo_id, pr_number, pr_url, compliance_score, violations_found)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(repoId, prNumber, prUrl, complianceScore, violationsFound);
}

function getPRReviews(repoId, limit = 10) {
  const stmt = db.prepare(`
    SELECT * FROM pr_reviews
    WHERE repo_id = ?
    ORDER BY reviewed_at DESC
    LIMIT ?
  `);
  return stmt.all(repoId, limit);
}

// Figma analysis methods
function insertFigmaAnalysis(figmaUrl, fileKey, nodeId, frameName, complianceScore, violations, generatedCode) {
  const stmt = db.prepare(`
    INSERT INTO figma_analyses (figma_url, file_key, node_id, frame_name, compliance_score, violations_json, generated_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(figmaUrl, fileKey, nodeId, frameName, complianceScore, JSON.stringify(violations), generatedCode);
}

function getFigmaAnalysis(figmaUrl) {
  const stmt = db.prepare('SELECT * FROM figma_analyses WHERE figma_url = ? ORDER BY analyzed_at DESC LIMIT 1');
  const result = stmt.get(figmaUrl);
  if (result) {
    result.violations = JSON.parse(result.violations_json);
  }
  return result;
}

// Metrics methods
function getRepoMetrics(repoId) {
  const repo = getRepoById(repoId);
  if (!repo) return null;

  const snapshots = getRepoSnapshots(repoId);
  const files = getRepoFileCompliance(repoId);
  const prReviews = getPRReviews(repoId);

  // Calculate violation breakdown
  const violationBreakdown = {};
  files.forEach(file => {
    file.violations.forEach(v => {
      const type = v.type || 'unknown';
      violationBreakdown[type] = (violationBreakdown[type] || 0) + 1;
    });
  });

  // Get top violating files
  const topViolatingFiles = files
    .sort((a, b) => b.violations.length - a.violations.length)
    .slice(0, 10)
    .map(f => ({
      filePath: f.file_path,
      violations: f.violations.length,
      complianceScore: f.compliance_score
    }));

  return {
    repository: repo,
    latestSnapshot: snapshots[0] || null,
    complianceTrend: snapshots.reverse(),
    violationBreakdown,
    topViolatingFiles,
    recentPRReviews: prReviews
  };
}

// Chat methods
function insertChatMessage(role, content, type = 'text', meta = null) {
  const stmt = db.prepare(`
    INSERT INTO chat_messages (role, content, type, meta_json)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(role, content, type, meta ? JSON.stringify(meta) : null);
}

function getRecentChatMessages(limit = 50) {
  const stmt = db.prepare('SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?');
  return stmt.all(limit);
}

function clearChatHistory() {
  const stmt = db.prepare('DELETE FROM chat_messages');
  return stmt.run();
}

// Get all repositories
function getAllRepositories() {
  const stmt = db.prepare('SELECT * FROM repositories ORDER BY last_analyzed DESC');
  return stmt.all();
}

// Initialize database on import
initializeDatabase();

export {
  db,
  initializeDatabase,
  insertRepo,
  getRepoByUrl,
  getRepoById,
  updateRepoStats,
  insertSnapshot,
  getRepoSnapshots,
  insertFileCompliance,
  getFileCompliance,
  getRepoFileCompliance,
  createAnalysisJob,
  updateAnalysisJob,
  getAnalysisJob,
  insertPRReview,
  getPRReviews,
  insertFigmaAnalysis,
  getFigmaAnalysis,
  getRepoMetrics,
  getAllRepositories,
  insertChatMessage,
  getRecentChatMessages,
  clearChatHistory
};
