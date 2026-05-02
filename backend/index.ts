import { Hono } from "hono"
import { cors } from "hono/cors"
import { convertRoute } from "./src/routes/convert"
import { convertSyncRoute } from "./src/routes/convertSync"
import { requestLogger } from "./src/middleware/logger"
import { requestId } from "./src/middleware/requestId"
import { queueStatusRoute } from "./src/routes/queueStatus"
import { statusRoute } from "./src/routes/status"
import { downloadRoute } from "./src/routes/download"
import { pollRoute } from "./src/routes/poll"

const app = new Hono()

// CORS must be first middleware
app.use("*", cors({
  origin: ["http://localhost:5173"],
  credentials: true,
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}))

app.route("/api", convertRoute)        // POST /api/convert (async)
app.route("/api", convertSyncRoute)     // POST /api/convert-sync (sync)
app.route("/api", queueStatusRoute)     // queue monitoring
app.route("/api", statusRoute)         // GET /api/convert/:jobId
app.route("/api", downloadRoute)        // GET /api/download/:jobId
app.route("/api", pollRoute)           // GET /api/poll/:jobId
app.use("*", requestId)
app.use("*", requestLogger)
export default {
  port: 3000,
  fetch: app.fetch,
}
