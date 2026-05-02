# Frontend UI

Modern React interface for ConvertPicture API.

## Features

- Drag & drop upload
- Real-time progress tracking
- State machine UI (idle → uploading → queued → processing → done)
- Download or retry on error
- Dark mode ready (TailwindCSS)

## Quick Start

```bash
cd frontend
bun install
bun run dev
```

Runs at `http://localhost:5173`

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build |
| `bun run preview` | Preview build |
| `bun run lint` | ESLint check |
| `bun run test` | Vitest tests |

## Tech Stack

- React 19
- Vite 8
- TailwindCSS 4
- Vitest (testing)