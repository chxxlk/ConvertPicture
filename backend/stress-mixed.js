import fs from "fs"

const URL = "http://localhost:3000/api/convert"
const CONCURRENT = 20
const DURATION = 15000
const testImage = fs.readFileSync("./test.webp")

async function sendRequest() {
  // Randomly choose format
  const format = ["png", "jpeg", "webp"][Math.floor(Math.random() * 3)]
  
  try {
    const formData = new FormData()
    formData.append("file", new Blob([testImage], { type: "image/webp" }), "test.webp")
    formData.append("format", format)

    const res = await fetch(URL, {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    const mode = res.headers.get("X-Conversion-Mode") || "async"
    
    if (res.ok) {
      return { status: "2xx", mode, jobId: data.jobId }
    }
    return "4xx"
  } catch (err) {
    return "error"
  }
}

const results = { "2xx": 0, sync: 0, async: 0, "4xx": 0, errors: 0 }
const start = Date.now()
let total = 0

while (Date.now() - start < DURATION) {
  const promises = Array.from({ length: CONCURRENT }, () => sendRequest())
  const statuses = await Promise.all(promises)
  for (const status of statuses) {
    total++
    if (typeof status === "object" && status.status === "2xx") {
      results["2xx"]++
      if (status.mode === "sync") results.sync++
      else results.async++
    } else if (status === "4xx") {
      results["4xx"]++
    } else {
      results.errors++
    }
  }
}

const elapsed = (Date.now() - start) / 1000
console.log(`\nMixed Load Test Results after ${elapsed.toFixed(2)}s:`)
console.log(`Total requests: ${total}`)
console.log(`2xx (success): ${results["2xx"]}`)
console.log(`  - Sync mode: ${results.sync}`)
console.log(`  - Async mode: ${results.async}`)
console.log(`4xx (client error): ${results["4xx"]}`)
console.log(`Errors: ${results.errors}`)
console.log(`Avg throughput: ${(total / elapsed).toFixed(0)} req/sec`)
