import { analyzeFigmaDesign, generateCodeFromFigma, compareFigmaToCode } from './openai-service.js';

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
function extractDesignData(node, styles = {}, depth = 0) {
  // Stop recursion at depth 3 to prevent massive payloads (30k+ tokens)
  if (depth > 3) return { type: node.type, name: node.name, note: 'Depth limit reached' };

  // Skip vector nodes' children as they are just path data usually
  const skipChildren = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'ELLIPSE', 'REGULAR_POLYGON', 'RECTANGLE'];

  const data = {
    name: node.name,
    type: node.type,
    // Round dimensions to save chars
    width: Math.round(node.absoluteBoundingBox?.width || 0),
    height: Math.round(node.absoluteBoundingBox?.height || 0),
    colors: [],
    typography: [],
    spacing: [],
    children: []
  };

  // Extract fills (colors) - Limit to 3 distinct colors per node to save tokens
  if (node.fills && Array.isArray(node.fills)) {
    let colorCount = 0;
    node.fills.forEach(fill => {
      if (colorCount >= 3) return;
      if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
        const { r, g, b, a = 1 } = fill.color;
        const hex = rgbToHex(r, g, b);

        // Check if this fill uses a style
        let tokenName = null;
        if (node.styles && node.styles.fill && styles[node.styles.fill]) {
          tokenName = styles[node.styles.fill].name;
        }

        data.colors.push({
          hex,
          opacity: Number((fill.opacity || a).toFixed(2)),
          type: 'fill',
          tokenName: tokenName // Pass the detected token name to AI
        });
        colorCount++;
      }
    });
  }

  // Extract strokes
  if (node.strokes && Array.isArray(node.strokes)) {
    node.strokes.forEach(stroke => {
      if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
        const { r, g, b, a = 1 } = stroke.color;
        const hex = rgbToHex(r, g, b);
        data.colors.push({
          hex,
          type: 'stroke',
          weight: node.strokeWeight
        });
      }
    });
  }

  // Extract typography
  if (node.type === 'TEXT' && node.style) {
    data.typography.push({
      font: node.style.fontFamily,
      size: node.style.fontSize,
      weight: node.style.fontWeight,
      height: node.style.lineHeightPx,
      case: node.style.textCase
    });
  }

  // Extract spacing (padding/gaps)
  if (node.paddingLeft) {
    data.spacing.push({
      type: 'padding',
      vals: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft]
    });
  }

  if (node.itemSpacing) {
    data.spacing.push({ type: 'gap', val: node.itemSpacing });
  }

  if (node.cornerRadius) {
    data.radius = node.cornerRadius;
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
    const analysis = await analyzeFigmaDesign(designData);

    return {
      success: true,
      figmaUrl,
      fileKey,
      nodeId,
      frameName: targetNode.document.name,
      imageUrl,
      designData,
      ...analysis
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
