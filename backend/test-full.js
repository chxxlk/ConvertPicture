import fs from "fs"

const BASE_URL = "http://localhost:3000/api"

async function test() {
  console.log("=== FULL SYSTEM TEST ===\n")

  // 1. Queue stats
  console.log("1. Queue stats...")
  let res = await fetch(`${BASE_URL}/queue/stats`)
  if (res.ok) {
    console.log("Stats:", await res.json())
  } else {
    console.log("Error:", res.status, await res.text())
  }

  // 2. Small file (should use SYNC mode)
  console.log("\n2. Testing SYNC mode (small file)...")
  const smallImage = fs.readFileSync("test.webp") // Use full file, let logic decide
  let formData = new FormData()
  formData.append("file", new Blob([smallImage], { type: "image/webp" }), "small.webp")
  formData.append("format", "jpeg") // webp→jpeg is now fast enough for sync

  res = await fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
  let data = await res.json()
  console.log("Response:", data)
  console.log("Mode header:", res.headers.get("X-Conversion-Mode"))

  // 3. Large file (should use ASYNC mode)
  console.log("\n3. Testing ASYNC mode (large file)...")
  const largeImage = fs.readFileSync("test.webp")
  formData = new FormData()
  formData.append("file", new Blob([largeImage], { type: "image/webp" }), "large.webp")
  formData.append("format", "png")

  res = await fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
  data = await res.json()
  console.log("Response:", data)

  if (data.jobId) {
    // 4. Check job status
    console.log("\n4. Checking job status...")
    await new Promise(r => setTimeout(r, 2000)) // Wait 2s
    res = await fetch(`${BASE_URL}/queue/job/${data.jobId}`)
    console.log("Job:", await res.json())

  // 5. Download result
  if (data.resultUrl) {
    console.log("\n5. Downloading result...")
    const downloadUrl = data.resultUrl.startsWith('http') ? data.resultUrl : `${BASE_URL}${data.resultUrl.replace('/api', '')}`
    console.log("Download URL:", downloadUrl)
    res = await fetch(downloadUrl)
    console.log("Download status:", res.status)
    console.log("Content-Type:", res.headers.get("Content-Type"))
  }
  }

  // 6. Failed jobs
  console.log("\n6. Failed jobs...")
  res = await fetch(`${BASE_URL}/queue/failed`)
  console.log("Failed:", await res.json())

  // 7. Final stats
  console.log("\n7. Final stats...")
  res = await fetch(`${BASE_URL}/queue/stats`)
  console.log("Stats:", await res.json())

  console.log("\n=== TEST COMPLETE ===")
}

test().catch(console.error)
