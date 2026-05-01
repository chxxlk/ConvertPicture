import { MiddlewareHandler } from "hono"
import { randomUUID } from "crypto"

// Store requestId in context with proper typing
declare module "hono" {
  interface ContextVariableMap {
    requestId: string
  }
}

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = randomUUID()
  c.set("requestId", id)
  await next()
  c.header("X-Request-Id", id)
}
