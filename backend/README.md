# Backend API

High-performance image conversion API powered by Bun, Sharp, and BullMQ.

## Performance

- **259 jobs/second** throughput
- Sub-second conversion for typical images
- Handles thousands of queued jobs
- 0% error rate under load

## Quick Start

```bash
cd backend
bun install
bun run dev
```

API runs on `http://localhost:3000`

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convert` | Async — returns jobId, poll for status |
| POST | `/api/convert-sync` | Sync — returns base64 immediately |
| GET | `/api/poll/:jobId` | Job status (queued/processing/completed/failed) |
| GET | `/api/download/:jobId` | Download converted image |
| GET | `/api/queue` | Queue stats (waiting, active, completed) |

### Convert Image (Async)

```bash
curl -F "image=@photo.jpg" -F "format=png" http://localhost:3000/api/convert
# {"jobId":"abc123","status":"queued"}
```

### Poll Status

```bash
curl http://localhost:3000/api/poll/abc123
# {"jobId":"abc123","status":"completed","progress":100}
```

### Download

```bash
curl -o output.png http://localhost:3000/api/download/abc123
```

## Production Features

- Redis AOF persistence — jobs survive restart
- Rate limiting — 100 req/min per IP
- Backpressure — 503 when queue saturated
- Auto-restart on crash (5s delay)

## Tech Stack

- **Bun** — Fast JavaScript runtime
- **Hono** — Lightweight API framework
- **BullMQ** — Redis-based job queue
- **Sharp** — High-performance image processing