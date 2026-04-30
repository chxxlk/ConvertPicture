import fs from "fs"

const BASE_URL = "http://localhost:3000/api"

async function test() {
  console.log("1. Testing queue stats...")
  let res = await fetch(`${BASE_URL}/queue/stats`)
  console.log("Stats:", await res.json())

  console.log("\n2. Submitting conversion job...")
  const formData = new FormData()
  formData.append("file", new Blob([fs.readFileSync("test.webp")], { type: "image/webp" }), "test.webp")
  formData.append("format", "png")

  res = await fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
  const text = await res.text()
  console.log("Response status:", res.status)
  console.log("Response:", text)

  if (!res.ok) {
    console.error("Failed to queue job")
    return
  }

  const { jobId } = JSON.parse(text)
  console.log("Job queued:", jobId)

  console.log("\n3. Checking job status...")
  await new Promise(r => setTimeout(r, 2000)) // Wait 2s
  res = await fetch(`${BASE_URL}/queue/job/${jobId}`)
  console.log("Job status:", await res.json())

  console.log("\n4. Checking failed jobs...")
  res = await fetch(`${BASE_URL}/queue/failed`)
  console.log("Failed jobs:", await res.json())

  console.log("\n5. Final stats...")
  res = await fetch(`${BASE_URL}/queue/stats`)
  console.log("Stats:", await res.json())
}

test().catch(console.error)
