import type { MiddlewareHandler } from "hono"

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  await next()
  const end = Date.now()
  console.log({
    requestId: c.get("requestId"),
    method: c.req.method,
    url: c.req.url,
    status: c.res.status,
    duration: end - start,
  })
}
