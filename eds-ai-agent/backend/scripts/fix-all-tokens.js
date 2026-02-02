
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { styles as typeStyles } from '@carbon/type';
import { breakpoints } from '@carbon/layout';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensPath = path.join(__dirname, '../data/carbon-tokens.json');
const existingData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

// Process Typography
// @carbon/type styles is an object like { 'body-01': { fontSize: ..., ... }, ... }
// We can use it directly.
const typography = {};
Object.entries(typeStyles).forEach(([key, value]) => {
    // Convert values to strings if needed, usually they are strings or numbers
    typography[key] = value;
});

// Process Breakpoints
// @carbon/layout breakpoints is { sm: { width: '320px', ... }, ... } or similar
// We need to check structure.
// Usually: { sm: { columns: 4, margin: '0', width: '320px' }, ... }
// Our current json uses simple key-value for width? 
// Current: "breakpoints": { "sm": "320px", ... }
// Let's normalize to width string.
const breakpointTokens = {};
Object.entries(breakpoints).forEach(([key, value]) => {
    if (typeof value === 'object' && value.width) {
        breakpointTokens[key] = value.width;
    } else {
        breakpointTokens[key] = value;
    }
});

const newData = {
    ...existingData,
    typography: typography,
    breakpoints: breakpointTokens
};

fs.writeFileSync(tokensPath, JSON.stringify(newData, null, 2));

console.log(`Updated typography with ${Object.keys(typography).length} tokens.`);
console.log(`Updated breakpoints:`, breakpointTokens);
