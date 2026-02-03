import { analyzeFigmaDesign, generateCodeFromFigma, compareFigmaToCode } from './openai-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Carbon tokens
const carbonTokens = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/carbon-tokens.json'), 'utf-8')
);

// Helper to flatten tokens for O(1) lookup
function flattenTokens(tokenObject, prefix = '') {
  let flattened = {};
  for (const key in tokenObject) {
    const value = tokenObject[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !value.fontSize && !value.value) { // Assuming typography tokens have fontSize, or skip if structure differs
      // Basic check for leaf node vs nested object
      // However, Carbon tokens structure in json: "color": { "blue-10": "#..." }
      // Typography: "body-01": { fontSize... }
      // Spacing: "spacing-01": "2px"
      if (Object.keys(value).some(k => typeof value[k] === 'object' && !value.fontSize)) {
        Object.assign(flattened, flattenTokens(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    } else {
      flattened[newKey] = value;
    }
  }
  return flattened;
}

// Pre-process tokens for validation
const colorsToTokenMap = {};
const spacingToTokenMap = {};
const typographyToTokenMap = {};

// Build Maps
Object.entries(carbonTokens.color || {}).forEach(([token, value]) => {
  if (typeof value === 'string') {
    colorsToTokenMap[value.toLowerCase()] = token;
    // Handle rgba/rgb logic if needed, but for now exact hex match
  }
});

Object.entries(carbonTokens.spacing || {}).forEach(([token, value]) => {
  // value is like "2px" or "0.125rem"
  spacingToTokenMap[value] = token;
  // Also store pixel number if possible for comparison? 
  // Let's rely on string match for now, or convert rem to px (16px base)
  if (value.endsWith('rem')) {
    const checkPx = parseFloat(value) * 16 + 'px';
    spacingToTokenMap[checkPx] = token;
  }
});

// Typography is more complex, exact match on object properties
Object.entries(carbonTokens.typography || {}).forEach(([token, value]) => {
  typographyToTokenMap[token] = value;
});


// Figma API base URL
const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Parse Figma URL to extract file key and node ID
 */
function parseFigmaUrl(url) {
  // Figma URL formats:
  // https://www.figma.com/file/FILEID/Title?node-id=NODEID
  // https://www.figma.com/design/FILEID/Title?node-id=NODEID
  // https://figma.com/file/FILEID/Title

  const patterns = [
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)(?:\/[^?]*)?(?:\?.*node-id=([^&]+))?/,
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        fileKey: match[1],
        nodeId: match[2] ? decodeURIComponent(match[2]) : null
      };
    }
  }

  throw new Error(`Invalid Figma URL: ${url}`);
}

/**
 * Make a request to Figma API
 */
async function figmaRequest(endpoint, options = {}) {
  const token = process.env.FIGMA_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Figma access token not configured');
  }

  const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get Figma file info
 */
async function getFigmaFile(fileKey) {
  try {
    return await figmaRequest(`/files/${fileKey}`);
  } catch (error) {
    console.error('Failed to get Figma file:', error);
    throw error;
  }
}

/**
 * Get a specific node/frame from Figma
 */
async function getFigmaNode(fileKey, nodeId) {
  try {
    const nodeIds = nodeId.replace('-', ':');
    return await figmaRequest(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds)}`);
  } catch (error) {
    console.error('Failed to get Figma node:', error);
    throw error;
  }
}

/**
 * Get rendered image of a Figma frame
 */
async function getFigmaImage(fileKey, nodeId, options = {}) {
  const {
    scale = 2,
    format = 'png'
  } = options;

  try {
    const nodeIds = nodeId.replace('-', ':');
    const response = await figmaRequest(
      `/images/${fileKey}?ids=${encodeURIComponent(nodeIds)}&scale=${scale}&format=${format}`
    );
    return response.images[nodeIds] || response.images[nodeId];
  } catch (error) {
    console.error('Failed to get Figma image:', error);
    throw error;
  }
}

/**
 * Extract design data from Figma node for analysis
 */
/**
 * Extract design data from Figma node for analysis
 * Optimized to reduce token usage by stripping unnecessary vector data
 */
/**
 * Extract design data from Figma node for analysis
 * STRICT MODE: No depth limits, capture all details.
 */
function extractDesignData(node, depth = 0) {
  // Relaxed depth limit for stricter analysis (was 3)
  if (depth > 20) return { type: node.type, name: node.name, note: 'Depth limit reached (20)' };

  // Skip vector nodes' children as they are just path data usually
  const skipChildren = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'ELLIPSE', 'REGULAR_POLYGON'];

  const data = {
    id: node.id,
    name: node.name,
    type: node.type,
    // Keep exact dimensions for validation
    width: node.absoluteBoundingBox?.width || 0,
    height: node.absoluteBoundingBox?.height || 0,
    roundedWidth: Math.round(node.absoluteBoundingBox?.width || 0),
    roundedHeight: Math.round(node.absoluteBoundingBox?.height || 0),
    fills: [],
    connectorFills: [], // For strokes etc
    typography: null,
    spacing: {},
    children: []
  };

  // Extract fills (colors) - Capture ALL
  if (node.fills && Array.isArray(node.fills)) {
    node.fills.forEach(fill => {
      if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
        const { r, g, b, a = 1 } = fill.color;
        const hex = rgbToHex(r, g, b);

        data.fills.push({
          hex,
          opacity: Number((fill.opacity || a).toFixed(2)),
          type: 'fill',
          visible: true
        });
      }
    });
  }

  // Extract strokes
  if (node.strokes && Array.isArray(node.strokes)) {
    node.strokes.forEach(stroke => {
      if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
        const { r, g, b, a = 1 } = stroke.color;
        const hex = rgbToHex(r, g, b);
        data.connectorFills.push({
          hex,
          type: 'stroke',
          weight: node.strokeWeight
        });
      }
    });
  }

  // Extract typography
  if (node.type === 'TEXT' && node.style) {
    data.typography = {
      fontFamily: node.style.fontFamily,
      fontSize: node.style.fontSize,
      fontWeight: node.style.fontWeight,
      lineHeightPx: node.style.lineHeightPx,
      lineHeightUnit: node.style.lineHeightUnit, // PIXELS, PERCENT, AUTO
      letterSpacing: node.style.letterSpacing,
      textCase: node.style.textCase
    };
  }

  // Extract spacing (padding/gaps)
  if (node.paddingLeft || node.paddingTop || node.paddingRight || node.paddingBottom) {
    data.spacing.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    };
  }

  if (node.itemSpacing) {
    data.spacing.gap = node.itemSpacing;
  }

  if (node.cornerRadius) {
    data.radius = node.cornerRadius; // Could be mixed, but taking single for now
  }

  // Process children recursively
  if (node.children && Array.isArray(node.children) && !skipChildren.includes(node.type)) {
    // Filter out invisible nodes
    const visibleChildren = node.children.filter(c => c.visible !== false);
    data.children = visibleChildren.map(child => extractDesignData(child, depth + 1));
  }

  return data;
}

/**
 * Validate design data against Carbon tokens strictly
 */
function validateDesignAgainstTokens(node, violations = []) {
  const nodeName = node.name || 'Unknown Node';

  // 1. Validate Fills
  node.fills?.forEach(fill => {
    const token = colorsToTokenMap[fill.hex.toLowerCase()];
    if (!token) {
      violations.push({
        type: 'strict-color-mismatch',
        severity: 'error',
        element: `Fill in "${nodeName}"`,
        current: fill.hex,
        message: `Color ${fill.hex} is not a valid Carbon token.`,
        carbonToken: 'Unknown'
      });
    }
  });

  // 2. Validate Strokes (Connector Fills)
  node.connectorFills?.forEach(stroke => {
    const token = colorsToTokenMap[stroke.hex.toLowerCase()];
    if (!token) {
      violations.push({
        type: 'strict-color-mismatch',
        severity: 'error',
        element: `Stroke in "${nodeName}"`,
        current: stroke.hex,
        message: `Stroke color ${stroke.hex} is not a valid Carbon token.`,
        carbonToken: 'Unknown'
      });
    }
  });

  // 3. Validate Spacing
  if (node.spacing?.padding) {
    Object.entries(node.spacing.padding).forEach(([side, value]) => {
      if (value === 0) return; // 0 is usually allowed, or handled by layout
      const valPx = `${value}px`;
      const token = spacingToTokenMap[valPx];
      if (!token) {
        violations.push({
          type: 'strict-spacing-mismatch',
          severity: 'error',
          element: `Padding-${side} in "${nodeName}"`,
          current: valPx,
          message: `Padding ${valPx} is not a valid Carbon spacing token.`,
          carbonToken: 'Closest valid token?'
        });
      }
    });
  }
  if (node.spacing?.gap) {
    const valPx = `${node.spacing.gap}px`;
    const token = spacingToTokenMap[valPx];
    if (!token) {
      violations.push({
        type: 'strict-spacing-mismatch',
        severity: 'error',
        element: `Gap in "${nodeName}"`,
        current: valPx,
        message: `Gap ${valPx} is not a valid Carbon spacing token.`,
        carbonToken: 'Unknown'
      });
    }
  }

  // 4. Validate Typography
  if (node.typography) {
    // Find best match or exact match
    let match = null;
    const currentFont = node.typography;

    // This is a simplified check. A robust one would check all props.
    // For now, let's checking if the combination of size + weight exists in any token
    const foundToken = Object.entries(typographyToTokenMap).find(([name, token]) => {
      // Basic fuzzy match on size (rem vs px)
      // Carbon tokens use rem strings.
      const tokenSizeRem = parseFloat(token.fontSize);
      const currentSizePx = currentFont.fontSize;
      const tokenSizePx = tokenSizeRem * 16;

      return Math.abs(tokenSizePx - currentSizePx) < 0.5 &&
        token.fontWeight == currentFont.fontWeight;
    });

    if (!foundToken) {
      violations.push({
        type: 'strict-typography-mismatch',
        severity: 'error',
        element: `Text in "${nodeName}"`,
        current: `${currentFont.fontSize}px / ${currentFont.fontWeight}`,
        message: `Typography config (size: ${currentFont.fontSize}, weight: ${currentFont.fontWeight}) matches no Carbon token.`,
        carbonToken: 'Unknown'
      });
    }
  }

  // Recurse
  node.children?.forEach(child => validateDesignAgainstTokens(child, violations));

  return violations;
}

/**
 * Convert RGB (0-1 range) to hex
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Analyze a Figma frame for Carbon compliance
 */
async function analyzeFigmaFrame(figmaUrl) {
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  // Check if we have a token
  if (!process.env.FIGMA_ACCESS_TOKEN) {
    // Return mock data for demo purposes
    return getMockFigmaAnalysis(figmaUrl);
  }

  try {
    // Get the node data
    const nodeData = await getFigmaNode(fileKey, nodeId || '0:0');
    const nodes = nodeData.nodes;
    const targetNode = nodes[nodeId?.replace('-', ':')] || Object.values(nodes)[0];

    if (!targetNode || !targetNode.document) {
      throw new Error('Node not found in Figma file');
    }

    // Extract design data
    const designData = extractDesignData(targetNode.document);

    // Get rendered image
    let imageUrl = null;
    if (nodeId) {
      try {
        imageUrl = await getFigmaImage(fileKey, nodeId);
      } catch (e) {
        console.error('⚠️  Could not get Figma image for node', nodeId, ':', e.message);
        // Add a placeholder if image fetch fails, with error text
        imageUrl = `https://placehold.co/600x400/161616/ffffff?text=Image+Error:+${encodeURIComponent(e.message)}`;
      }
    }

    // Analyze with Claude
    const aiAnalysis = await analyzeFigmaDesign(designData);

    // STRICT VALIDATION
    const strictViolations = validateDesignAgainstTokens(designData);

    // Merge strict violations into the response
    const combinedViolations = [
      ...strictViolations,
      ...(aiAnalysis.violations || [])
    ];

    // Update summary and score based on strict analysis
    const strictScore = Math.max(0, 100 - (strictViolations.length * 5));
    const finalScore = Math.min(aiAnalysis.complianceScore || 100, strictScore);
    const finalSummary = `Strict Analysis found ${strictViolations.length} deterministic violations. \nAI Summary: ${aiAnalysis.summary}`;


    return {
      success: true,
      figmaUrl,
      fileKey,
      nodeId,
      frameName: targetNode.document.name,
      imageUrl,
      designData,
      ...aiAnalysis,
      violations: combinedViolations,
      complianceScore: finalScore,
      summary: finalSummary
    };
  } catch (error) {
    console.error('Failed to analyze Figma frame:', error);
    return {
      success: false,
      error: error.message || 'Figma analysis failed'
    };
  }
}

/**
 * Generate Carbon React code from Figma
 */
async function generateCodeFromFigmaUrl(figmaUrl) {
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  if (!process.env.FIGMA_ACCESS_TOKEN) {
    return getMockGeneratedCode(figmaUrl);
  }

  try {
    const nodeData = await getFigmaNode(fileKey, nodeId || '0:0');
    const nodes = nodeData.nodes;
    const targetNode = nodes[nodeId?.replace('-', ':')] || Object.values(nodes)[0];

    if (!targetNode || !targetNode.document) {
      throw new Error('Node not found in Figma file');
    }

    const designData = extractDesignData(targetNode.document);
    const result = await generateCodeFromFigma(designData);

    return {
      success: true,
      figmaUrl,
      frameName: targetNode.document.name,
      ...result
    };
  } catch (error) {
    console.error('Failed to generate code from Figma:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate code from Figma'
    };
  }
}

/**
 * Compare Figma design to code implementation
 */
async function compareFigmaToImplementation(figmaUrl, code, fileName = 'component.jsx') {
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  if (!process.env.FIGMA_ACCESS_TOKEN) {
    return getMockDriftComparison(figmaUrl, code);
  }

  try {
    const nodeData = await getFigmaNode(fileKey, nodeId || '0:0');
    const nodes = nodeData.nodes;
    const targetNode = nodes[nodeId?.replace('-', ':')] || Object.values(nodes)[0];

    if (!targetNode || !targetNode.document) {
      throw new Error('Node not found in Figma file');
    }

    const designData = extractDesignData(targetNode.document);

    let imageUrl = null;
    if (nodeId) {
      try {
        imageUrl = await getFigmaImage(fileKey, nodeId);
      } catch (e) {
        console.log('Could not get Figma image:', e.message);
      }
    }

    const result = await compareFigmaToCode(designData, code, fileName);

    return {
      success: true,
      figmaUrl,
      frameName: targetNode.document.name,
      imageUrl,
      designData,
      ...result
    };
  } catch (error) {
    console.error('Failed to compare Figma to code:', error);
    return {
      success: false,
      error: error.message || 'Failed to compare Figma to code'
    };
  }
}

// Mock data functions for demo/offline mode

function getMockFigmaAnalysis(figmaUrl) {
  return {
    success: true,
    figmaUrl,
    fileKey: 'mock-file-key',
    nodeId: 'mock-node-id',
    frameName: 'Primary Button',
    imageUrl: 'https://via.placeholder.com/400x300/1E88E5/FFFFFF?text=Primary+Button',
    designData: {
      name: 'Primary Button',
      type: 'FRAME',
      width: 120,
      height: 48,
      colors: [
        { hex: '#1E88E5', type: 'fill' },
        { hex: '#FFFFFF', type: 'text' }
      ],
      typography: [
        { fontFamily: 'IBM Plex Sans', fontSize: 14, fontWeight: 600 }
      ],
      spacing: [
        { type: 'padding', left: 16, right: 16, top: 14, bottom: 14 }
      ],
      cornerRadius: 4
    },
    violations: [
      {
        type: 'color-mismatch',
        severity: 'warning',
        element: 'Button background',
        current: '#1E88E5',
        expected: '#0f62fe',
        carbonToken: 'color.interactive.primary',
        message: 'Button background color #1E88E5 should use Carbon primary color #0f62fe'
      },
      {
        type: 'spacing-mismatch',
        severity: 'info',
        element: 'Button padding',
        current: '14px',
        expected: '16px',
        carbonToken: 'spacing.lg',
        message: 'Vertical padding should use Carbon spacing.lg (16px)'
      }
    ],
    componentType: 'Button',
    carbonEquivalent: "<Button kind='primary' size='lg'>Label</Button>",
    complianceScore: 72,
    summary: 'Design mostly aligns with Carbon Button. Minor color and spacing adjustments needed.'
  };
}

function getMockGeneratedCode(figmaUrl) {
  return {
    success: true,
    figmaUrl,
    frameName: 'Primary Button',
    code: `import { Button } from '@carbon/react';

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <Button
      kind="primary"
      size="lg"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export default PrimaryButton;`,
    imports: ["import { Button } from '@carbon/react';"],
    componentName: 'PrimaryButton',
    props: ['children', 'onClick', 'disabled'],
    usage: `<PrimaryButton onClick={handleClick}>
  Click me
</PrimaryButton>`,
    notes: [
      'Generated from Figma design',
      'Uses Carbon Button component with primary kind',
      'Size lg matches the design dimensions'
    ]
  };
}

function getMockDriftComparison(figmaUrl, code) {
  return {
    success: true,
    figmaUrl,
    frameName: 'Primary Button',
    imageUrl: null,
    designData: {
      name: 'Primary Button',
      type: 'FRAME',
      colors: [{ hex: '#0f62fe', type: 'fill' }]
    },
    driftItems: [
      {
        type: 'color-drift',
        severity: 'major',
        designValue: '#0f62fe',
        codeValue: '#006FCF',
        element: 'Button background',
        message: 'Button background color in code (#006FCF) differs from Figma design (#0f62fe)',
        suggestedFix: "Use Carbon token 'color.interactive.primary' (#0f62fe) instead of hardcoded color"
      },
      {
        type: 'spacing-drift',
        severity: 'minor',
        designValue: '16px',
        codeValue: '12px',
        element: 'Padding',
        message: 'Padding in code (12px) differs from Figma design (16px)',
        suggestedFix: "Use Carbon spacing token 'spacing.lg' for 16px padding"
      }
    ],
    alignmentScore: 65,
    summary: 'Significant drift detected between Figma design and code implementation. Main issues are color and spacing mismatches.',
    criticalDrift: 1,
    minorDrift: 1
  };
}

export {
  parseFigmaUrl,
  getFigmaFile,
  getFigmaNode,
  getFigmaImage,
  extractDesignData,
  analyzeFigmaFrame,
  generateCodeFromFigmaUrl,
  compareFigmaToImplementation
};
