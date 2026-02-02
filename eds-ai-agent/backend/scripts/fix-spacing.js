
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensPath = path.join(__dirname, '../data/carbon-tokens.json');

const existingData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

// Official Carbon v11 Spacing Layout
// https://carbondesignsystem.com/guidelines/spacing/overview/
const spacingTokens = {
    "spacing-01": "2px",
    "spacing-02": "4px",
    "spacing-03": "8px",
    "spacing-04": "12px",
    "spacing-05": "16px",
    "spacing-06": "24px",
    "spacing-07": "32px",
    "spacing-08": "48px",
    "spacing-09": "64px",
    "spacing-10": "80px",
    "spacing-11": "96px",
    "spacing-12": "160px",
    "spacing-13": "250px"
};

// Update data
const newData = {
    ...existingData,
    spacing: spacingTokens
};

fs.writeFileSync(tokensPath, JSON.stringify(newData, null, 2));

console.log('Updated carbon-tokens.json with v11 spacing tokens.');
