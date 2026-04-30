# AGENTS.md

## Project Structure

Bun monorepo with two packages:
- `backend/` - Hono API server (Bun runtime, TypeScript)
- `frontend/` - React + Tailwind SPA (Bun runtime, Vite-like bundler)

## Commands

Backend:
```bash
cd backend && bun install
bun run index.ts
```

Frontend:
```bash
cd frontend && bun install
bun dev          # dev server with HMR
bun start        # production mode
bun run build    # output to dist/
```

## Key Facts

- Runtime: Bun v1.3.13 (not Node)
- Backend entrypoint: `backend/index.ts` (currently empty, skeleton only)
- Frontend entrypoint: `frontend/src/index.ts` (Bun.serve with routes)
- Frontend uses `@/*` path alias → `./src/*` (tsconfig.json)
- Build uses `bun-plugin-tailwind` for Tailwind v4 processing
- No tests, linting, or CI configured
- `.env` files gitignored but no env loading configured
