# EDS Atlas Demo Guide

This guide walks through demonstrating EDS Atlas capabilities.

## Setup for Demo

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000
4. Ensure "Mock Data" toggle is ON (right side of header)

## Demo Scenarios

### Scenario 1: Chat Interface Analysis

**Talking Points:**
- EDS Atlas uses AI to understand design system violations
- Natural language interface - just paste URLs or code

**Steps:**
1. On the Home page, you'll see the chat interface
2. Click "Try sample code" tag
3. Watch as the AI analyzes and identifies violations
4. Point out: violation types, severity levels, compliance score

### Scenario 2: Code Inspector (Engineer View)

**Talking Points:**
- Monaco editor with inline violation highlighting
- Live React preview shows actual rendered output
- Side panel shows detailed fixes

**Steps:**
1. Click "Code Inspector" in the mode bar (or navigate to /engineer)
2. Click "Load Demo" to load sample code with violations
3. Show the split view: code on left, preview on right
4. Click on a violation in the gutter to see details
5. Demonstrate the "Before/After" tabs in the panel
6. Show the "Visual" tab for color comparisons

### Scenario 3: Designer View

**Talking Points:**
- Designed for designers - no code knowledge needed
- Visual comparisons of colors, spacing, typography
- Figma-specific action items

**Steps:**
1. Navigate to Designer page (/designer)
2. Click "Try Demo" to load a sample Figma analysis
3. Point out: design preview, violation cards, color swatches
4. Show how each violation has a "Designer Action" - no code!
5. Highlight the Carbon equivalent component suggestion

### Scenario 4: Drift Detection

**Talking Points:**
- Detects when code drifts from design specs
- Side-by-side Figma vs Code comparison
- Critical issues flagged for immediate attention

**Steps:**
1. On Home page, click "Drift Detector" in mode bar
2. Show the three-pane layout: Figma | Code | Drift Items
3. Point out alignment score and severity tags
4. Click on a drift item to see details
5. Show the "Apply Fix" button for quick corrections

### Scenario 5: Compliance Dashboard

**Talking Points:**
- Track compliance trends over time
- Identify systemic issues
- Monitor PR quality

**Steps:**
1. Navigate to Dashboard (/dashboard)
2. Show the compliance score and trend chart
3. Point out the violation breakdown pie chart
4. Show top violating files bar chart
5. Discuss how this helps prioritize remediation

## Key Features to Highlight

### AI-Powered Analysis
- Uses Claude to understand code semantics
- Suggests context-aware fixes
- Recognizes component patterns

### Carbon Design System Integration
- Full token library built-in
- Component mapping suggestions
- Accessibility checks included

### Role-Based Views
- **Designer**: Visual focus, no code
- **Engineer**: Code editor, live preview
- **Manager**: Dashboard metrics

### Mock Mode
- Works without API keys
- Great for demos and testing
- Toggle in top-right corner

## Common Questions

**Q: Does this require access to our code?**
A: For repo analysis, yes - but you can also paste code directly in the chat.

**Q: How accurate is the AI analysis?**
A: Very good for common patterns. Complex cases may need human review.

**Q: Can it auto-fix violations?**
A: It suggests fixes that you review and apply. Not fully automatic.

**Q: Does it work with other design systems?**
A: Currently focused on Carbon, but architecture supports extension.

**Q: What about false positives?**
A: Some occur. Use the "Dismiss" option in the violation panel.

## Demo Tips

1. **Keep it visual** - Use the preview and visual comparison features
2. **Show the journey** - Chat → Analysis → Fix → Verify
3. **Highlight time savings** - "Instead of manual review..."
4. **Mention extensibility** - Custom rules, CI/CD integration
5. **End with dashboard** - Shows long-term value

## Troubleshooting

**Frontend won't start:**
```bash
rm -rf node_modules .next
npm install
npm run dev
```

**Backend connection error:**
- Ensure backend is running on port 3001
- Check CORS settings if using custom domains

**Mock data not loading:**
- Toggle "Mock Data" off and on
- Refresh the page
