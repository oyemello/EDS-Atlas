# Deployment Config Correction

I reviewed your Render settings screenshot.

### ⚠️ CRITICAL CHANGE REQUIRED
**Please switch the "Language" dropdown from `Node` to `Docker`.**

### Why?
You are currently set to `Node`, but I specifically created a `Dockerfile` in the repository to handle all the complex dependencies (System libraries, etc.) securely.
- **Node**: Might fail with `yarn` vs `npm` errors or missing system packages.
- **Docker**: Will automatically read my `Dockerfile` and build the exact environment we need. It is much safer and easier.

### Correct Settings Summary:
- **Name**: `EDS-Atlas` (Correct)
- **Language**: **Docker** (Change this!)
- **Branch**: `main` (Correct)
- **Root Directory**: `eds-ai-agent/backend` (Correct)
- **Dockerfile Path**: `Dockerfile` (or `./Dockerfile`) - *Since root is already set to the backend folder.*
- **Environment Variables**: Don't forget to add:
    - `OPENAI_API_KEY`
    - `FIGMA_ACCESS_TOKEN`
    - `API_SECRET`
