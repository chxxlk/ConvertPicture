# AGENTS.md

## Project Structure
Bun monorepo with two packages:
- `backend/`: Hono API (Bun, TypeScript, Redis + BullMQ, Sharp)
- `frontend/`: Vite + React SPA

## Commands
Backend (orchestrates Redis → Worker → Backend via `start-server.ts`):
```bash
cd backend && bun install
bun run dev   # dev mode, auto-restarts crashed services (5s delay)
bun run start # production mode (same startup flow)
```

Frontend (Vite + React):
```bash
cd frontend && bun install
bun run dev   # vite dev server (port 5173, HMR)
bun run build # vite build → dist/
bun run preview # vite preview (production build)
```

## Key Facts
- Runtime: Bun (not Node). TypeScript errors are warnings only — execution continues despite them.
- Port config: Backend `3000`, Frontend `5173` (Vite default). Backend crashes with `EADDRINUSE` if port 3000 is occupied.
- Backend entrypoint: `backend/index.ts` (Hono routes: `/api/convert`, `/api/convert-sync`, `/api/queue/*`, `/api/poll/*`, `/api/download/*`). CORS allows `http://localhost:3001` — **needs update to `http://localhost:5173`**.
- Backend process manager: `backend/src/start-server.ts` uses `Bun.spawn` (not PM2). Starts Redis → Worker → Backend in order, auto-restarts crashed services (5s delay).
- Backend requires Redis on `127.0.0.1:6379` (configurable via `REDIS_HOST`/`REDIS_PORT`). `start-server.ts` starts Redis with AOF persistence if not running.
- Backend worker starts with `--expose-gc` flag.
- Frontend entrypoint: `frontend/src/main.tsx` (Vite + React). Vite dev server on port 5173 with HMR.
- Frontend env vars: Use Vite `VITE_*` prefix for client-side env vars if needed (e.g., `VITE_BACKEND_URL`).
- Rate limiter: 100 req/min per IP (backend `src/middleware/rateLimit.ts`).
- No tests configured. Frontend has eslint configured.
