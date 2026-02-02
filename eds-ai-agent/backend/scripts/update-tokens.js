
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { white } from '@carbon/themes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensPath = path.join(__dirname, '../data/carbon-tokens.json');

// Read existing file to keep spacing/typography
const existingData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

// Format colors (convert camelCase to kebab-case if preferred, but Carbon React uses camelCase props usually, checking prompt...)
// The prompt checks for "matching Carbon token".
// Carbon CSS vars are --cds-text-primary. React tokens are often accessible constants or just strings.
// I'll keep the raw values from @carbon/themes which are keys like 'textPrimary': '#161616'.
// This is perfect.

const newData = {
    ...existingData,
    color: white
};

fs.writeFileSync(tokensPath, JSON.stringify(newData, null, 2));

console.log('Successfully updated carbon-tokens.json with ' + Object.keys(white).length + ' color tokens.');
