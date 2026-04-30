import fs from "fs"

const BASE_URL = "http://localhost:3000/api"
const testImage = fs.readFileSync("test.webp")

async function testSync() {
  console.log("=== SYNC LOAD TEST (100 requests) ===")
  let success = 0, failed = 0
  const start = Date.now()
  const testImage = fs.readFileSync("test.webp")

  const promises = Array.from({ length: 100 }, () => {
    const formData = new FormData()
    formData.append("file", new Blob([testImage], { type: "image/webp" }), "test.webp")
    formData.append("format", "jpeg")

    return fetch(`${BASE_URL}/convert-sync`, { method: "POST", body: formData })
      .then(r => { if (r.ok) success++; else failed++ })
      .catch(() => failed++)
  })

  await Promise.all(promises)
  const elapsed = (Date.now() - start) / 1000
  console.log(`Results: ${success} success, ${failed} failed`)
  console.log(`Throughput: ${(100 / elapsed).toFixed(0)} req/sec`)
  console.log(`Avg latency: ${(elapsed / 100 * 1000).toFixed(0)}ms`)
}

async function testAsync() {
  console.log("\n=== ASYNC LOAD TEST (1000 jobs) ===")
  let success = 0, failed = 0
  const start = Date.now()
  const testImage = fs.readFileSync("test.webp")

  const promises = Array.from({ length: 1000 }, (_, i) => {
    const formData = new FormData()
    formData.append("file", new Blob([testImage], { type: "image/webp" }), `test-${i}.webp`)
    formData.append("format", "png")

    return fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
      .then(r => r.json())
      .then(data => { if (data.jobId) success++; else failed++ })
      .catch(() => failed++)
  })

  await Promise.all(promises)
  const elapsed = (Date.now() - start) / 1000
  console.log(`Jobs queued: ${success} success, ${failed} failed`)
  console.log(`Queue throughput: ${(1000 / elapsed).toFixed(0)} jobs/sec`)
  console.log(`Time: ${elapsed.toFixed(2)}s`)

  // Wait for processing
  console.log("\nWaiting for jobs to complete...")
  await new Promise(r => setTimeout(r, 10000))

  // Check final stats
  const res = await fetch(`${BASE_URL}/queue/stats`)
  console.log("Final queue stats:", await res.json())
}

async function monitorResources() {
  console.log("\n=== RESOURCE MONITORING ===")
  
  // Redis stats
  const redisStats = await Bun.spawn(["redis-cli", "info", "stats"], { stdout: "pipe" }).exited
  console.log("Redis stats checked")

  // CPU check (simple)
  console.log("Check CPU: run `top` or `htop` in another terminal")
}

async function main() {
  // Test sync first (100 requests)
  await testSync()

  // Small delay between tests
  await new Promise(r => setTimeout(r, 2000))

  // Test async (1000 jobs)
  await testAsync()

  await monitorResources()

  console.log("\n=== LOAD TEST COMPLETE ===")
}

main().catch(console.error)
