# Repository Guidelines

## Instructions
This repository follows the project specification in:

docs/CommerceIQ_Project_Specification.md

Rules:

1. Read the specification before making changes.
2. Follow milestone-based development.
3. Never skip checkpoints.
4. Do not implement future milestones.
5. Update docs/progress.md after every milestone.
6. Preserve working code.
7. Favor simple maintainable solutions.
8. Do not expose secrets.
9. Do not use mock AI implementations unless explicitly requested.
10. Stop after completing the current milestone.

## Project Structure

This repository is currently specification-first. `README.md` and `docs/CommerceIQ_Project_Specification.md` define the product scope, architecture, milestones, and acceptance checks. Read the specification before changing code; it is the source of truth until implementation begins.

The planned monorepo layout is `client/` for the React/Vite application and `server/` for the Express/MongoDB API. Keep frontend code under `client/src/` (for example, `components/`, `pages/`, `api/`, and `assets/`). Keep backend code under `server/src/`, separated into `controllers/`, `services/`, `models/`, `routes/`, `middleware/`, `validators/`, `ai/`, and `seed/`. Put backend tests in `server/tests/` and maintain implementation notes in `docs/`.

## Development Workflow

Implement one documented milestone at a time. Before starting work, inspect the repository, identify the current milestone, and run relevant checks. Do not begin the next milestone until its checkpoint is visibly verified. Update `docs/progress.md` after each completed milestone with completed work, verification, known issues, and the next milestone.

Once the planned Node workspaces exist, use their declared scripts rather than ad-hoc commands. Expected commands will include:

- `npm run dev` — start the local client or server development process.
- `npm run build` — produce a production build.
- `npm test` — run automated tests.
- `npm run lint` — check formatting and static issues.

Document any added script in the appropriate package README or `package.json`.

## Code Style and Naming

Prefer TypeScript; use modern JavaScript only when TypeScript adds unnecessary complexity. Use consistent two-space indentation, semicolons, and descriptive names. Name React components and Mongoose models in PascalCase (`RevenueChart`, `Product`); use camelCase for functions and variables (`calculateInventoryRisk`); use kebab-case for route and prompt filenames (`analytics-assistant.v1.ts`). Keep route handlers thin: route → controller → service. AI calls belong in `server/src/ai/`, never in controllers or browser code.

## Testing and Security

Add focused unit tests for calculations, validators, and AI tool dispatch; add integration tests for auth and API endpoints. Use descriptive test names such as `returns critical risk when stock covers three days`. Validate all request and tool inputs. Never commit `.env` files, API keys, tokens, or real customer data; keep `GEMINI_API_KEY` server-side only.

## Commits and Pull Requests

Use small Conventional Commit-style messages, consistent with the planned workflow: `feat(auth): add merchant login`, `test(analytics): cover revenue aggregation`, or `chore: initialize server`. Pull requests should describe the milestone scope, checks run, any configuration changes, and include screenshots for UI changes. Link relevant issues and call out known limitations explicitly.
