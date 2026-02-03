import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Carbon tokens and components
const carbonTokens = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/carbon-tokens.json'), 'utf-8')
);
const carbonComponents = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/carbon-components.json'), 'utf-8')
);

// Initialize OpenAI client
let openai = null;

function getClient() {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

// Model configuration
// Model configuration
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano'; // User requested gpt-5-nano
const MAX_TOKENS = 4096;

// Retry helper with exponential backoff
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

// Load prompts
const loadPrompt = (filename) => fs.readFileSync(path.join(__dirname, `../prompts/${filename}`), 'utf-8');

const CODE_ANALYSIS_PROMPT = loadPrompt('code-analysis.txt')
    .replace('{{CARBON_TOKENS}}', JSON.stringify(carbonTokens, null, 2))
    .replace('{{CARBON_COMPONENTS}}', JSON.stringify(Object.keys(carbonComponents), null, 2));

const GENERAL_CHAT_PROMPT = loadPrompt('general-chat.txt');

/**
 * Analyze code for Carbon Design System violations
 */
async function analyzeCode(code, fileName = 'unknown.jsx') {
    const client = getClient();

    // If no API key, return mock analysis
    if (!client) {
        return generateMockAnalysis(code, fileName);
    }

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: CODE_ANALYSIS_PROMPT },
                    {
                        role: 'user',
                        content: `Analyze this React code file (${fileName}) for Carbon Design System compliance:\n\n\`\`\`javascript\n${code}\n\`\`\``
                    }
                ]
            });
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

/**
 * Generate a fix for a specific violation
 */
async function suggestFix(violation, originalCode, context = '') {
    const client = getClient();

    if (!client) {
        return generateMockFix(violation, originalCode);
    }

    const promptTemplate = loadPrompt('suggest-fix.txt');
    const prompt = promptTemplate
        .replace('{{VIOLATION}}', JSON.stringify(violation, null, 2))
        .replace('{{ORIGINAL_CODE}}', originalCode)
        .replace('{{CONTEXT}}', context ? `Additional Context:\n${context}\n` : '')
        .replace('{{CARBON_TOKENS}}', JSON.stringify(carbonTokens, null, 2));

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: "You are a helpful coding assistant." },
                    { role: 'user', content: prompt }
                ]
            });
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to generate fix:', error);
        return {
            fixedCode: originalCode,
            explanation: 'Failed to generate fix',
            error: error.message
        };
    }
}

/**
 * Analyze Figma design data for Carbon compliance
 */
async function analyzeFigmaDesign(figmaData) {
    const client = getClient();

    if (!client) {
        return generateMockFigmaAnalysis(figmaData);
    }

    const promptTemplate = loadPrompt('figma-analysis.txt');
    const prompt = promptTemplate
        .replace('{{FIGMA_DATA}}', JSON.stringify(figmaData, null, 2))
        .replace('{{CARBON_TOKENS}}', JSON.stringify(carbonTokens, null, 2));

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: "You are a helpful design assistant." },
                    { role: 'user', content: prompt }
                ]
            });
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to analyze Figma design:', error);
        throw error;
    }
}

/**
 * Generate Carbon React code from Figma design
 */
async function generateCodeFromFigma(figmaData, componentType = null) {
    const client = getClient();

    if (!client) {
        return generateMockCodeFromFigma(figmaData, componentType);
    }

    const promptTemplate = loadPrompt('generate-code.txt');
    const prompt = promptTemplate
        .replace('{{FIGMA_DATA}}', JSON.stringify(figmaData, null, 2))
        .replace('{{COMPONENT_TYPE}}', componentType ? `Detected Component Type: ${componentType}` : '')
        .replace('{{CARBON_COMPONENTS}}', JSON.stringify(carbonComponents, null, 2));

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: "You are a helpful coding assistant." },
                    { role: 'user', content: prompt }
                ]
            });
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to generate code from Figma:', error);
        throw error;
    }
}

/**
 * Compare Figma design to code implementation for drift detection
 */
async function compareFigmaToCode(figmaData, code, fileName = 'component.jsx') {
    const client = getClient();

    if (!client) {
        return generateMockDriftAnalysis(figmaData, code);
    }

    const promptTemplate = loadPrompt('drift-analysis.txt');
    const prompt = promptTemplate
        .replace('{{FIGMA_DATA}}', JSON.stringify(figmaData, null, 2))
        .replace('{{FILE_NAME}}', fileName)
        .replace('{{CODE}}', code)
        .replace('{{CARBON_TOKENS}}', JSON.stringify(carbonTokens, null, 2));

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: "You are a helpful coding assistant." },
                    { role: 'user', content: prompt }
                ]
            });
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to compare Figma to code:', error);
        throw error;
    }
}

/**
 * General chat response (design/dev focused)
 */
async function generalChat(message, context = '') {
    const client = getClient();

    if (!client) {
        return generateMockChat(message);
    }

    try {
        const response = await withRetry(async () => {
            return await client.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [
                    { role: 'system', content: GENERAL_CHAT_PROMPT },
                    { role: 'user', content: `${context ? `Context: ${context}\n\n` : ''}${message}` }
                ]
            });
        });

        const text = response.choices[0].message.content || 'Sorry, I could not generate a response.';
        return { reply: text };
    } catch (error) {
        console.error('General chat error:', error);
        return { reply: 'Sorry, something went wrong generating a response.' };
    }
}

// Mock analysis generators for when API key is not available
// (Copied primarily from claude-service.js for fallback consistency)

function generateMockAnalysis(code, fileName) {
    const violations = [];
    const lines = code.split('\n');

    // Simple pattern matching for common violations
    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for hardcoded colors
        const colorMatch = line.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
        if (colorMatch) {
            colorMatch.forEach(color => {
                violations.push({
                    line: lineNum,
                    column: line.indexOf(color),
                    type: 'hardcoded-color',
                    severity: 'error',
                    message: `Hardcoded color "${color}" should use Carbon color tokens`,
                    code: color,
                    suggestedFix: `Use Carbon token like 'tokens.color.interactive.primary'`,
                    carbonToken: 'color.interactive.primary'
                });
            });
        }

        // Check for hardcoded spacing
        const spacingMatch = line.match(/:\s*['"]?\d+px['"]?/g);
        if (spacingMatch) {
            spacingMatch.forEach(spacing => {
                const value = spacing.match(/\d+/)[0];
                const carbonSpacing = getCarbonSpacing(parseInt(value));
                violations.push({
                    line: lineNum,
                    column: line.indexOf(spacing),
                    type: 'hardcoded-spacing',
                    severity: 'warning',
                    message: `Hardcoded spacing "${value}px" should use Carbon spacing token`,
                    code: spacing,
                    suggestedFix: `Use Carbon spacing token: ${carbonSpacing}`,
                    carbonToken: carbonSpacing
                });
            });
        }

        // Check for custom button elements
        if (line.includes('<button') && !line.includes('Button')) {
            violations.push({
                line: lineNum,
                column: line.indexOf('<button'),
                type: 'custom-component',
                severity: 'error',
                message: 'Custom <button> element should use Carbon Button component',
                code: '<button>',
                suggestedFix: "import { Button } from '@carbon/react';",
                carbonComponent: 'Button'
            });
        }

        // Check for custom input elements
        if (line.includes('<input') && !line.includes('TextInput')) {
            violations.push({
                line: lineNum,
                column: line.indexOf('<input'),
                type: 'custom-component',
                severity: 'error',
                message: 'Custom <input> element should use Carbon TextInput component',
                code: '<input>',
                suggestedFix: "import { TextInput } from '@carbon/react';",
                carbonComponent: 'TextInput'
            });
        }
    });

    const complianceScore = Math.max(0, 100 - (violations.length * 10));

    return {
        violations,
        complianceScore,
        summary: `Found ${violations.length} violations in ${fileName}`,
        positives: violations.length === 0 ? ['Code appears to be Carbon compliant'] : []
    };
}

function getCarbonSpacing(value) {
    const spacingMap = {
        4: 'spacing.xs',
        8: 'spacing.sm',
        12: 'spacing.md',
        16: 'spacing.lg',
        24: 'spacing.xl',
        32: 'spacing.2xl',
        48: 'spacing.3xl',
        64: 'spacing.4xl'
    };

    // Find closest Carbon spacing
    const spacingValues = Object.keys(spacingMap).map(Number);
    const closest = spacingValues.reduce((prev, curr) =>
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );

    return spacingMap[closest] || 'spacing.lg';
}

function generateMockFix(violation, originalCode) {
    return {
        fixedCode: originalCode.replace(
            violation.code,
            `{/* TODO: Replace with ${violation.carbonToken || violation.carbonComponent} */}`
        ),
        explanation: `Replace ${violation.code} with Carbon ${violation.carbonToken || violation.carbonComponent}`,
        carbonImports: violation.carbonComponent ? [`import { ${violation.carbonComponent} } from '@carbon/react';`] : []
    };
}

function generateMockFigmaAnalysis(figmaData) {
    return {
        violations: [
            {
                type: 'color-mismatch',
                severity: 'warning',
                element: 'Primary Button',
                current: '#1E88E5',
                expected: '#0f62fe',
                carbonToken: 'color.interactive.primary',
                message: 'Button color does not match Carbon primary color'
            }
        ],
        componentType: 'Button',
        carbonEquivalent: "<Button kind='primary'>Click me</Button>",
        complianceScore: 75,
        summary: 'Design mostly complies with Carbon. Minor color adjustments needed.'
    };
}

function generateMockCodeFromFigma(figmaData, componentType) {
    return {
        code: `import { Button } from '@carbon/react';

function GeneratedComponent() {
  return (
    <Button kind="primary" size="lg">
      Click me
    </Button>
  );
}

export default GeneratedComponent;`,
        imports: ["import { Button } from '@carbon/react';"],
        componentName: 'GeneratedComponent',
        props: [],
        usage: '<GeneratedComponent />',
        notes: ['Generated from Figma design', 'Uses Carbon Button component']
    };
}

function generateMockDriftAnalysis(figmaData, code) {
    return {
        driftItems: [
            {
                type: 'color-drift',
                severity: 'major',
                designValue: '#0f62fe',
                codeValue: '#006FCF',
                element: 'Button background',
                message: 'Button background color differs from design',
                suggestedFix: "Use Carbon token 'color.interactive.primary' (#0f62fe)"
            }
        ],
        alignmentScore: 70,
        summary: 'Some drift detected between Figma design and code implementation',
        criticalDrift: 0,
        minorDrift: 1
    };
}

function generateMockChat(message) {
    return {
        reply: `Mock AI: I received "${message}". In demo mode I can't reach OpenAI, but normally I'd give a concise, Carbon-aware answer.`
    };
}

export {
    analyzeCode,
    suggestFix,
    analyzeFigmaDesign,
    generateCodeFromFigma,
    compareFigmaToCode,
    generalChat,
    carbonTokens,
    carbonComponents
};
