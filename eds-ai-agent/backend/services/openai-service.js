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

// System prompt for code analysis
const CODE_ANALYSIS_PROMPT = `You are an expert in IBM Carbon Design System compliance. Your task is to analyze React/JavaScript code for Carbon Design System violations.

## Carbon Design System Tokens
${JSON.stringify(carbonTokens, null, 2)}

## Available Carbon Components
${JSON.stringify(Object.keys(carbonComponents), null, 2)}

## What to Check For:
1. **Hardcoded Colors**: Any color values like #hex, rgb(), rgba(), hsl() that should use Carbon tokens
2. **Hardcoded Spacing**: Values like '16px', '24px' that should use Carbon spacing tokens
3. **Custom Components**: Custom buttons, inputs, modals that should use Carbon components
4. **Typography Issues**: Custom font sizes/weights that should use Carbon typography tokens
5. **Accessibility Issues**: Missing labels, ARIA attributes, improper semantics
6. **Inline Styles**: Excessive inline styles that should be replaced with Carbon styling

## Response Format
Return a valid JSON object (no markdown, no code blocks) with this structure:
{
  "violations": [
    {
      "line": <line number>,
      "column": <column number>,
      "type": "<violation-type>",
      "severity": "error" | "warning" | "info",
      "message": "<human-readable description>",
      "code": "<the actual violating code snippet>",
      "suggestedFix": "<suggested Carbon-compliant code>",
      "carbonToken": "<the Carbon token that should be used, if applicable>",
      "carbonComponent": "<the Carbon component that should be used, if applicable>",
      "documentation": "<link to relevant Carbon documentation>"
    }
  ],
  "complianceScore": <0-100>,
  "summary": "<brief summary of findings>",
  "positives": ["<things done correctly>"]
}

## Violation Types:
- hardcoded-color
- hardcoded-spacing
- custom-component
- typography-violation
- accessibility-violation
- inline-style
- missing-carbon-import
- improper-component-usage

## Severity Guidelines:
- error: Direct violation of Carbon guidelines (hardcoded colors, custom components replacing Carbon ones)
- warning: Potential issues or improvements (spacing inconsistencies, missing optimizations)
- info: Suggestions for better practices

Analyze the code thoroughly and provide actionable feedback.`;

// General chat prompt
const GENERAL_CHAT_PROMPT = `You are EDS Atlas, a concise, helpful AI for UI engineering and IBM Carbon Design System best practices. 
- Answer naturally like ChatGPT.
- When questions involve Carbon, accessibility, React, or design-to-code workflows, give practical, stepwise guidance.
- If information is missing, ask clarifying questions briefly or state assumptions.`;

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

    const prompt = `You are a Carbon Design System expert. Given this violation, provide the corrected code.

Violation:
${JSON.stringify(violation, null, 2)}

Original Code:
\`\`\`javascript
${originalCode}
\`\`\`

${context ? `Additional Context:\n${context}\n` : ''}

Available Carbon Tokens:
${JSON.stringify(carbonTokens, null, 2)}

Provide the corrected code that:
1. Fixes the violation
2. Uses proper Carbon tokens/components
3. Maintains the original functionality

Return ONLY valid JSON (no markdown) with this structure:
{
  "fixedCode": "<the corrected code>",
  "explanation": "<what was changed and why>",
  "carbonImports": ["<any new imports needed>"]
}`;

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

    // Read prompt from file
    const promptTemplate = fs.readFileSync(path.join(__dirname, '../prompts/figma-analysis.txt'), 'utf-8');

    // Interpolate data
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

    const prompt = `You are a Carbon Design System expert. Generate Carbon React code from this Figma design.

Figma Design Data:
${JSON.stringify(figmaData, null, 2)}

${componentType ? `Detected Component Type: ${componentType}` : ''}

Available Carbon Components:
${JSON.stringify(carbonComponents, null, 2)}

Generate production-ready React code that:
1. Uses Carbon React components
2. Follows Carbon patterns and best practices
3. Is accessible
4. Is properly structured

Return ONLY valid JSON (no markdown) with:
{
  "code": "<the generated React component code>",
  "imports": ["<required imports>"],
  "componentName": "<suggested component name>",
  "props": ["<component props>"],
  "usage": "<example usage>",
  "notes": ["<any implementation notes>"]
}`;

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

    const prompt = `You are a Carbon Design System expert. Compare this Figma design to its code implementation and detect any drift.

Figma Design:
${JSON.stringify(figmaData, null, 2)}

Code Implementation (${fileName}):
\`\`\`javascript
${code}
\`\`\`

Carbon Design Tokens:
${JSON.stringify(carbonTokens, null, 2)}

Identify:
1. Color drift (design colors vs implementation colors)
2. Spacing drift (design spacing vs implementation spacing)
3. Typography drift
4. Component structure drift
5. Missing elements
6. Extra elements not in design

Return ONLY valid JSON (no markdown) with:
{
  "driftItems": [
    {
      "type": "color-drift" | "spacing-drift" | "typography-drift" | "structure-drift" | "missing-element" | "extra-element",
      "severity": "critical" | "major" | "minor",
      "designValue": "<value in Figma>",
      "codeValue": "<value in code>",
      "element": "<element description>",
      "message": "<human-readable description>",
      "suggestedFix": "<how to align code with design>"
    }
  ],
  "alignmentScore": <0-100>,
  "summary": "<brief summary of drift>",
  "criticalDrift": <count>,
  "minorDrift": <count>
}`;

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
