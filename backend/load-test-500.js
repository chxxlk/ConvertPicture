import fs from "fs"

const BASE_URL = "http://localhost:3000/api"
const testImage = fs.readFileSync("test.webp")

async function testAsync() {
  console.log("=== ASYNC LOAD TEST (500 jobs) ===")
  let success = 0, failed = 0
  const start = Date.now()

  const promises = Array.from({ length: 500 }, (_, i) => {
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
  console.log(`Queue throughput: ${(500 / elapsed).toFixed(0)} jobs/sec`)
  console.log(`Time: ${elapsed.toFixed(2)}s`)

  // Wait for processing
  console.log("\nWaiting 15s for jobs to complete...")
  await new Promise(r => setTimeout(r, 15000))

  // Check final stats
  const res = await fetch(`${BASE_URL}/queue/stats`)
  console.log("Final queue stats:", await res.json())
}

async function main() {
  await testAsync()
  console.log("\n=== LOAD TEST COMPLETE ===")
}

main().catch(console.error)
