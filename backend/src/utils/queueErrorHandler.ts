import { logger } from "./logger"

export function handleQueueError(err: any) {
  logger.error({
    msg: "Queue/Redis error",
    error: err.message,
    code: err.code,
  })

  // Redis connection failed
  if (err.code === "ECONNREFUSED") {
    console.error("Redis connection refused. Make sure Redis is running:")
    console.error("  redis-server")
    process.exit(1)
  }
}
