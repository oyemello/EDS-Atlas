# EDS Atlas Demo Repository

This repository contains React components with **intentional Carbon Design System violations** for testing the EDS Atlas analysis tool.

## Purpose

This demo repo is used to test and demonstrate the EDS Atlas design system compliance analyzer. It contains:

- Components with **hardcoded colors** that should use Carbon tokens
- Components with **hardcoded spacing** that should use Carbon spacing scale
- **Custom form elements** that should use Carbon components
- **Typography violations** with non-standard font sizes
- **Accessibility issues** (poor color contrast)
- One **fully compliant** Carbon component for comparison

## Components

### PaymentForm.jsx (Many Violations)
- Hardcoded colors: `#006FCF`, `#FF0000`, `#333333`
- Custom `<input>` and `<button>` elements
- Non-standard padding and margins
- Accessibility: poor contrast on helper text

### AddressForm.jsx (Multiple Violations)
- Custom `<input>` and `<select>` elements
- Hardcoded colors: `#444444`, `#2196F3`
- Non-standard border colors

### Header.jsx (Minor Violations)
- Close to Carbon but uses custom background color
- Custom icon button instead of HeaderGlobalAction

### Card.jsx (Minor Violations)
- Should use Carbon Tile component
- Custom box-shadow instead of Carbon elevation

### GoodButton.jsx (Compliant)
- Uses Carbon Button component correctly
- Proper props: `kind`, `size`, `renderIcon`
- This serves as an example of compliant code

## Expected Analysis Results

When analyzed by EDS Atlas, this repo should show:

| File | Compliance | Violations |
|------|------------|------------|
| PaymentForm.jsx | ~40% | 8-10 |
| AddressForm.jsx | ~55% | 5-7 |
| Header.jsx | ~78% | 2-3 |
| Card.jsx | ~70% | 3-4 |
| GoodButton.jsx | 100% | 0 |

## How to Test

1. Start the EDS Atlas backend: `cd backend && npm run dev`
2. Start the EDS Atlas frontend: `cd frontend && npm run dev`
3. Paste this repo URL in the chat: `https://github.com/your-org/eds-atlas-demo`
4. Or copy individual component code to test file analysis

## Carbon Design System Resources

- [Carbon Design System](https://carbondesignsystem.com/)
- [Carbon React Components](https://react.carbondesignsystem.com/)
- [Carbon Color Tokens](https://carbondesignsystem.com/guidelines/color/tokens/)
- [Carbon Spacing](https://carbondesignsystem.com/guidelines/spacing/overview/)
