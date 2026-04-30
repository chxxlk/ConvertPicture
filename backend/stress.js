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

    return res.ok ? "2xx" : `${res.status}`
  } catch (err) {
    return "error"
  }
}

const results = { "2xx": 0, "4xx": 0, "5xx": 0, errors: 0 }
const start = Date.now()
let total = 0
let active = 0

const workers = Array.from({ length: CONCURRENT }, () => {
  return (async () => {
    while (Date.now() - start < DURATION) {
      active++
      const status = await sendRequest()
      active--
      total++
      if (status === "2xx") results["2xx"]++
      else if (status.startsWith("4")) results["4xx"]++
      else if (status.startsWith("5")) results["5xx"]++
      else results.errors++
    }
  })()
})

await Promise.all(workers)

const elapsed = (Date.now() - start) / 1000
console.log(`\nResults after ${elapsed.toFixed(2)}s:`)
console.log(`Total requests: ${total}`)
console.log(`2xx (success): ${results["2xx"]}`)
console.log(`4xx (client error): ${results["4xx"]}`)
console.log(`5xx (server error): ${results["5xx"]}`)
console.log(`Errors: ${results.errors}`)
console.log(`Avg throughput: ${(total / elapsed).toFixed(0)} req/sec`)
console.log(`Peak concurrent: ${CONCURRENT}`)
