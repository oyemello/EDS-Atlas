import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Octokit if token is available
let octokit = null;

function getOctokit() {
  if (!octokit && process.env.GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }
  return octokit;
}

// Temp directory for cloned repos
const TEMP_DIR = path.join(__dirname, '../temp/repos');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Parse GitHub URL to extract owner and repo
 */
function parseGitHubUrl(repoUrl) {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
    /^([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
  }

  throw new Error(`Invalid GitHub URL: ${repoUrl}`);
}

/**
 * Get repo info from GitHub API
 */
async function getRepoInfo(repoUrl) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const client = getOctokit();

  if (!client) {
    // Return basic info without API
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      defaultBranch: 'main',
      private: false
    };
  }

  try {
    const { data } = await client.repos.get({ owner, repo });
    return {
      owner,
      repo,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      description: data.description,
      language: data.language
    };
  } catch (error) {
    console.error('Failed to get repo info:', error);
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      defaultBranch: 'main',
      private: false
    };
  }
}

/**
 * Clone a repository to temp directory
 */
async function cloneRepo(repoUrl) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const repoPath = path.join(TEMP_DIR, `${owner}-${repo}`);

  // Remove existing directory if it exists
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }

  // Clone the repository
  const git = simpleGit();

  // Construct clone URL
  let cloneUrl = repoUrl;
  if (!cloneUrl.includes('://')) {
    cloneUrl = `https://github.com/${owner}/${repo}.git`;
  }
  if (!cloneUrl.endsWith('.git')) {
    cloneUrl = cloneUrl + '.git';
  }

  // Add token to URL if available
  if (process.env.GITHUB_TOKEN) {
    cloneUrl = cloneUrl.replace('https://', `https://${process.env.GITHUB_TOKEN}@`);
  }

  try {
    await git.clone(cloneUrl, repoPath, ['--depth', '1']);
    return {
      success: true,
      path: repoPath,
      owner,
      repo
    };
  } catch (error) {
    console.error('Clone error:', error);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Get all React/JavaScript files from a repository
 */
function getRepoFiles(repoPath, extensions = ['.jsx', '.js', '.tsx', '.ts']) {
  const files = [];

  // Directories to ignore
  const ignoreDirs = ['node_modules', '.git', 'build', 'dist', '.next', 'coverage', '__tests__', 'test', 'tests'];

  function walkDir(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walkDir(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push({
              path: fullPath,
              relativePath: relPath,
              name: entry.name,
              extension: ext
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }

  // Start from src directory if it exists, otherwise from root
  const srcPath = path.join(repoPath, 'src');
  if (fs.existsSync(srcPath)) {
    walkDir(srcPath, 'src');
  } else {
    walkDir(repoPath);
  }

  return files;
}

/**
 * Get file content
 */
function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get file content from GitHub API (without cloning)
 */
async function getFileFromGitHub(repoUrl, filePath, branch = 'main') {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const client = getOctokit();

  if (!client) {
    throw new Error('GitHub token required for remote file access');
  }

  try {
    const { data } = await client.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch
    });

    if (data.type !== 'file') {
      throw new Error('Path is not a file');
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      content,
      path: filePath,
      sha: data.sha,
      size: data.size
    };
  } catch (error) {
    console.error('Failed to get file from GitHub:', error);
    throw error;
  }
}

/**
 * List directory contents from GitHub API
 */
async function listDirectory(repoUrl, dirPath = '', branch = 'main') {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const client = getOctokit();

  if (!client) {
    throw new Error('GitHub token required for remote directory listing');
  }

  try {
    const { data } = await client.repos.getContent({
      owner,
      repo,
      path: dirPath,
      ref: branch
    });

    if (!Array.isArray(data)) {
      return [data];
    }

    return data.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size
    }));
  } catch (error) {
    console.error('Failed to list directory:', error);
    throw error;
  }
}

/**
 * Get PR information
 */
async function getPRInfo(repoUrl, prNumber) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const client = getOctokit();

  if (!client) {
    throw new Error('GitHub token required for PR access');
  }

  try {
    const { data } = await client.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      author: data.user.login,
      base: data.base.ref,
      head: data.head.ref,
      changedFiles: data.changed_files,
      additions: data.additions,
      deletions: data.deletions
    };
  } catch (error) {
    console.error('Failed to get PR info:', error);
    throw error;
  }
}

/**
 * Get files changed in a PR
 */
async function getPRFiles(repoUrl, prNumber) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const client = getOctokit();

  if (!client) {
    throw new Error('GitHub token required for PR access');
  }

  try {
    const { data } = await client.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    return data.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch
    }));
  } catch (error) {
    console.error('Failed to get PR files:', error);
    throw error;
  }
}

/**
 * Cleanup cloned repository
 */
function cleanupRepo(repoPath) {
  try {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to cleanup repo:', error);
    return false;
  }
}

/**
 * Cleanup all temp repos
 */
function cleanupAllRepos() {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const entries = fs.readdirSync(TEMP_DIR);
      for (const entry of entries) {
        const entryPath = path.join(TEMP_DIR, entry);
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to cleanup all repos:', error);
    return false;
  }
}

export {
  parseGitHubUrl,
  getRepoInfo,
  cloneRepo,
  getRepoFiles,
  getFileContent,
  getFileFromGitHub,
  listDirectory,
  getPRInfo,
  getPRFiles,
  cleanupRepo,
  cleanupAllRepos
};
