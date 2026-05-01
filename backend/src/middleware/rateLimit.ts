type Record = {
  timestamps: number[]
}

const store = new Map<string, Record>()

const WINDOW_MS = 60 * 1000 //1 menit
const MAX_REQUEST = 100

export const rateLimit = (ip: string) : boolean => {
  const now = Date.now()

  if (!store.has(ip)) {
    store.set(ip, { timestamps: [] })
  }

  const record = store.get(ip)!

  // buang request lama
  record.timestamps = record.timestamps.filter(
    (t) => now - t < WINDOW_MS
  )

  record.timestamps.push(now)

  return record.timestamps.length > MAX_REQUEST
}
