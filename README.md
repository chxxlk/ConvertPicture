# ConvertPicture

Production-grade image conversion API that just works.

## Why This?

| What You Get | Why It Matters |
|--------------|----------------|
| 259 jobs/sec | Outperforms most cloud services |
| Async queues | Handle burst traffic without downtime |
| Redis persistence | Jobs survive server restart |
| Simple REST API | Drop into any project |
| Self-hosted | No per-image pricing |

## One-Minute Setup

```bash
# Clone & run
git clone https://github.com/chvrlxs/ConvertPicture.git
cd ConvertPicture/backend && bun install && bun run dev
```

## Convert Your First Image

```bash
curl -F "image=@photo.jpg" -F "format=webp" http://localhost:3000/api/convert
# {"jobId":"abc123","status":"queued"}

curl http://localhost:3000/api/poll/abc123
# {"jobId":"abc123","status":"completed","progress":100}

curl -o photo.webp http://localhost:3000/api/download/abc123
```

Done. 3 API calls. No registration. No credit card.

## What It Handles

- JPG ↔ PNG ↔ WEBP ↔ AVIF conversion
- Thousands of queued jobs
- Automatic file cleanup
- Progress tracking
- ZIP download for batches
- Rate limiting & backpressure

## Production-Ready

- Auto-restart on crash
- Redis AOF persistence
- 100 req/min rate limit
- Backpressure (503 when busy)
- Sub-second processing

## Tech Stack

**Bun** + **Hono** + **BullMQ** + **Redis** + **Sharp**

Built on rock-solid open source. No vendor lock-in.

See [backend/README.md](./backend/README.md) for API details.