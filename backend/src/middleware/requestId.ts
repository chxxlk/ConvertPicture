import type { MiddlewareHandler } from "hono"
import { randomUUID } from "crypto"

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = randomUUID()
  c.set("requestId", id)
  await next()
  c.header("X-Request-Id", id)
}
