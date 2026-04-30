import fs from "fs"

const URL = "http://localhost:3000/api/convert"
const CONCURRENT = 50
const DURATION = 15000
const testImage = fs.readFileSync("./test.webp")

async function sendRequest() {
  try {
    const formData = new FormData()
    formData.append("file", new Blob([testImage], { type: "image/webp" }), "test.webp")
    formData.append("format", "png")

    const res = await fetch(URL, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) return "4xx"
    const data = await res.json()
    return { status: "2xx", jobId: data.jobId }
  } catch (err) {
    return "error"
  }
}

const results = { "2xx": 0, "4xx": 0, errors: 0, jobIds: [] }
const start = Date.now()
let total = 0

while (Date.now() - start < DURATION) {
  const promises = Array.from({ length: CONCURRENT }, () => sendRequest())
  const statuses = await Promise.all(promises)
  for (const status of statuses) {
    total++
    if (typeof status === "object" && status.status === "2xx") {
      results["2xx"]++
      results.jobIds.push(status.jobId)
    } else if (status === "4xx") {
      results["4xx"]++
    } else {
      results.errors++
    }
  }
}

const elapsed = (Date.now() - start) / 1000
console.log(`\nLoad Test Results after ${elapsed.toFixed(2)}s:`)
console.log(`Total requests: ${total}`)
console.log(`2xx (queued): ${results["2xx"]}`)
console.log(`4xx (client error): ${results["4xx"]}`)
console.log(`Errors: ${results.errors}`)
console.log(`Avg throughput: ${(total / elapsed).toFixed(0)} req/sec`)
console.log(`Jobs queued: ${results.jobIds.length}`)
