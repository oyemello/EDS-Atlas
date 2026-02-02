import { v4 as uuidv4 } from 'uuid';
import {
  cloneRepo,
  getRepoFiles,
  getFileContent,
  parseGitHubUrl,
  cleanupRepo
} from './github-service.js';
import { analyzeCode } from './openai-service.js';
import {
  insertRepo,
  insertSnapshot,
  insertFileCompliance,
  updateRepoStats,
  createAnalysisJob,
  updateAnalysisJob,
  getAnalysisJob,
  getRepoFileCompliance
} from '../database/db.js';

/**
 * Analyze a repository for Carbon Design System compliance
 */
async function analyzeRepository(repoUrl, options = {}) {
  const {
    onProgress = () => { },
    jobId = uuidv4()
  } = options;

  // Create analysis job
  createAnalysisJob(jobId);

  try {
    // Parse repo URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const repoName = `${owner}/${repo}`;

    onProgress({ status: 'cloning', message: `Cloning ${repoName}...`, progress: 5 });
    updateAnalysisJob(jobId, { status: 'cloning', progress: 5 });

    // Clone repository
    const cloneResult = await cloneRepo(repoUrl);
    const repoPath = cloneResult.path;

    onProgress({ status: 'scanning', message: 'Scanning for React files...', progress: 15 });
    updateAnalysisJob(jobId, { status: 'scanning', progress: 15 });

    // Get all React files
    const files = getRepoFiles(repoPath);
    const totalFiles = files.length;

    if (totalFiles === 0) {
      throw new Error('No React/JavaScript files found in repository');
    }

    // Insert or update repo in database
    const dbRepo = insertRepo(repoUrl, repoName);

    updateAnalysisJob(jobId, {
      status: 'analyzing',
      progress: 20,
      total_files: totalFiles,
      analyzed_files: 0,
      repo_id: dbRepo.id
    });

    onProgress({
      status: 'analyzing',
      message: `Analyzing ${totalFiles} files...`,
      progress: 20,
      totalFiles
    });

    // Analyze each file
    const fileAnalyses = [];
    let analyzedCount = 0;
    let totalViolations = 0;
    let criticalViolations = 0;
    let warnings = 0;
    let totalComplianceScore = 0;

    for (const file of files) {
      try {
        const content = getFileContent(file.path);
        if (!content) continue;

        // Skip very large files
        if (content.length > 50000) {
          console.log(`Skipping large file: ${file.relativePath}`);
          continue;
        }

        // Analyze the file
        const analysis = await analyzeCode(content, file.name);

        // Calculate violation counts
        const fileViolations = analysis.violations || [];
        const fileCritical = fileViolations.filter(v => v.severity === 'error').length;
        const fileWarnings = fileViolations.filter(v => v.severity === 'warning').length;

        totalViolations += fileViolations.length;
        criticalViolations += fileCritical;
        warnings += fileWarnings;
        totalComplianceScore += analysis.complianceScore || 0;

        // Store file analysis
        const fileAnalysis = {
          filePath: file.relativePath,
          fileName: file.name,
          complianceScore: analysis.complianceScore || 0,
          violations: fileViolations,
          summary: analysis.summary || '',
          positives: analysis.positives || []
        };

        fileAnalyses.push(fileAnalysis);

        // Save to database
        insertFileCompliance(
          dbRepo.id,
          file.relativePath,
          analysis.complianceScore || 0,
          fileViolations
        );

        analyzedCount++;
        const progress = 20 + Math.floor((analyzedCount / totalFiles) * 70);

        updateAnalysisJob(jobId, {
          progress,
          analyzed_files: analyzedCount
        });

        onProgress({
          status: 'analyzing',
          message: `Analyzed ${analyzedCount}/${totalFiles} files`,
          progress,
          currentFile: file.relativePath,
          analyzedCount,
          totalFiles
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error analyzing ${file.relativePath}:`, error);
      }
    }

    // Calculate overall compliance score
    const overallCompliance = analyzedCount > 0
      ? Math.round(totalComplianceScore / analyzedCount)
      : 0;

    // Detect patterns
    onProgress({ status: 'detecting_patterns', message: 'Detecting patterns...', progress: 92 });
    const patterns = detectPatterns(fileAnalyses);

    // Update repo stats
    updateRepoStats(dbRepo.id, totalFiles, analyzedCount);

    // Save snapshot
    insertSnapshot(dbRepo.id, overallCompliance, totalViolations, criticalViolations, warnings);

    // Cleanup cloned repo
    cleanupRepo(repoPath);

    // Prepare results
    const results = {
      repoUrl,
      repoName,
      overallCompliance,
      totalFiles,
      analyzedFiles: analyzedCount,
      totalViolations,
      criticalViolations,
      warnings,
      fileAnalyses: fileAnalyses.sort((a, b) => a.complianceScore - b.complianceScore),
      patterns,
      topViolatingFiles: fileAnalyses
        .sort((a, b) => b.violations.length - a.violations.length)
        .slice(0, 10),
      analyzedAt: new Date().toISOString()
    };

    // Update job as complete
    updateAnalysisJob(jobId, {
      status: 'complete',
      progress: 100,
      results_json: results
    });

    onProgress({
      status: 'complete',
      message: 'Analysis complete!',
      progress: 100,
      results
    });

    return results;
  } catch (error) {
    console.error('Repository analysis failed:', error);

    updateAnalysisJob(jobId, {
      status: 'error',
      error: error.message
    });

    throw error;
  }
}

/**
 * Detect patterns (systemic issues) across files
 */
function detectPatterns(fileAnalyses) {
  const patterns = [];
  const violationCounts = {};
  const violationFiles = {};

  // Count violation types across all files
  fileAnalyses.forEach(file => {
    file.violations.forEach(violation => {
      const type = violation.type;
      violationCounts[type] = (violationCounts[type] || 0) + 1;

      if (!violationFiles[type]) {
        violationFiles[type] = [];
      }
      if (!violationFiles[type].includes(file.fileName)) {
        violationFiles[type].push(file.fileName);
      }
    });
  });

  // Identify patterns (violations appearing in multiple files)
  Object.entries(violationCounts).forEach(([type, count]) => {
    if (count >= 3 || violationFiles[type].length >= 2) {
      patterns.push({
        type,
        instances: count,
        files: violationFiles[type],
        recommendation: getPatternRecommendation(type, count)
      });
    }
  });

  // Sort by instance count
  return patterns.sort((a, b) => b.instances - a.instances);
}

/**
 * Get recommendation for a pattern type
 */
function getPatternRecommendation(type, count) {
  const recommendations = {
    'hardcoded-color': `Found ${count} hardcoded colors. Consider creating a centralized theme file using Carbon color tokens.`,
    'hardcoded-spacing': `Found ${count} hardcoded spacing values. Use Carbon spacing tokens for consistency.`,
    'custom-component': `Found ${count} custom components. Replace with Carbon equivalents for consistency and accessibility.`,
    'typography-violation': `Found ${count} typography issues. Use Carbon typography tokens for consistent text styling.`,
    'accessibility-violation': `Found ${count} accessibility issues. Review WCAG guidelines and use Carbon accessibility patterns.`,
    'inline-style': `Found ${count} inline styles. Consider using Carbon's style system or CSS modules.`,
    'missing-carbon-import': `Missing Carbon imports in ${count} places. Ensure proper imports from @carbon/react.`,
    'improper-component-usage': `Found ${count} improper component usages. Review Carbon component documentation.`
  };

  return recommendations[type] || `Found ${count} instances of ${type}. Review and update for Carbon compliance.`;
}

/**
 * Get analysis job status
 */
function getAnalysisStatus(jobId) {
  const job = getAnalysisJob(jobId);

  if (!job) {
    return { status: 'not_found', error: 'Analysis job not found' };
  }

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    totalFiles: job.total_files,
    analyzedFiles: job.analyzed_files,
    error: job.error,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };
}

/**
 * Get analysis results
 */
function getAnalysisResults(jobId) {
  const job = getAnalysisJob(jobId);

  if (!job) {
    return { error: 'Analysis job not found' };
  }

  if (job.status !== 'complete') {
    return {
      status: job.status,
      error: job.status === 'error' ? job.error : 'Analysis not complete'
    };
  }

  return job.results;
}

/**
 * Quick analysis of a single file
 */
async function analyzeFile(code, fileName = 'component.jsx') {
  try {
    const analysis = await analyzeCode(code, fileName);
    return {
      success: true,
      fileName,
      ...analysis
    };
  } catch (error) {
    console.error('File analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get cached analysis for a repo
 */
function getCachedRepoAnalysis(repoId) {
  const files = getRepoFileCompliance(repoId);
  if (!files || files.length === 0) {
    return null;
  }

  let totalViolations = 0;
  let criticalViolations = 0;
  let warnings = 0;
  let totalScore = 0;

  files.forEach(file => {
    totalViolations += file.violations.length;
    criticalViolations += file.violations.filter(v => v.severity === 'error').length;
    warnings += file.violations.filter(v => v.severity === 'warning').length;
    totalScore += file.compliance_score;
  });

  return {
    fileAnalyses: files.map(f => ({
      filePath: f.file_path,
      complianceScore: f.compliance_score,
      violations: f.violations,
      lastUpdated: f.last_updated
    })),
    totalFiles: files.length,
    totalViolations,
    criticalViolations,
    warnings,
    overallCompliance: Math.round(totalScore / files.length)
  };
}

export {
  analyzeRepository,
  analyzeFile,
  detectPatterns,
  getAnalysisStatus,
  getAnalysisResults,
  getCachedRepoAnalysis
};
