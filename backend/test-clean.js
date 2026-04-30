import fs from "fs"

const BASE_URL = "http://localhost:3000/api"

async function test() {
  console.log("=== CLEAN API TEST ===\n")

  // 1. ASYNC: Upload file
  console.log("1. POST /convert (async)...")
  let formData = new FormData()
  formData.append("file", new Blob([fs.readFileSync("test.webp")], { type: "image/webp" }), "test.webp")
  formData.append("format", "png")

  let res = await fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
  let data = await res.json()
  console.log("Response:", data)

  if (!data.jobId) {
    console.error("No jobId returned!")
    return
  }

  const jobId = data.jobId

  // 2. Check status
  console.log("\n2. GET /convert/:jobId...")
  await new Promise(r => setTimeout(r, 2000)) // Wait 2s
  res = await fetch(`${BASE_URL}/convert/${jobId}`)
  data = await res.json()
  console.log("Status:", data)

  // 3. Download when ready
  if (data.status === "completed") {
    console.log("\n3. GET /download/:jobId...")
    res = await fetch(`${BASE_URL}/download/${jobId}`)
    console.log("Download status:", res.status)
    console.log("Content-Type:", res.headers.get("Content-Type"))
  } else {
    console.log("\n3. Waiting for completion...")
  }

  // 4. SYNC: Direct conversion (small file, simple conversion)
  console.log("\n4. POST /convert-sync (sync)...")
  const smallImage = fs.readFileSync("test.webp")
  let formData2 = new FormData()
  formData2.append("file", new Blob([smallImage], { type: "image/webp" }), "test.webp")
  formData2.append("format", "jpeg") // Simple conversion

  res = await fetch(`${BASE_URL}/convert-sync`, { method: "POST", body: formData2 })
  console.log("Sync response status:", res.status)
  console.log("Content-Type:", res.headers.get("Content-Type"))

  console.log("\n=== TEST COMPLETE ===")
}

test().catch(console.error)
