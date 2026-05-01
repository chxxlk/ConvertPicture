import fs from "fs";

const BASE_URL = "http://localhost:3000/api";
const testImage = fs.readFileSync("/home/chvr/Projects/ConvertPicture/test-image.webp");
const TOTAL_JOBS = 10000;
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 100;

async function sendBatch(batchNum) {
  const promises = Array.from({ length: BATCH_SIZE }, (_, i) => {
    const jobId = batchNum * BATCH_SIZE + i;
    const formData = new FormData();
    formData.append("file", new Blob([testImage], { type: "image/webp" }), `test-${jobId}.webp`);
    formData.append("format", "png");

    return fetch(`${BASE_URL}/convert`, { method: "POST", body: formData })
      .then(async (r) => {
        const data = await r.json();
        return { status: r.status, jobId: data.jobId, error: data.error };
      })
      .catch((e) => ({ error: e.message }));
  });

  return Promise.all(promises);
}

async function main() {
  console.log(`Starting backpressure test: ${TOTAL_JOBS} jobs...`);
  const start = Date.now();
  let success = 0,
    failed = 0,
    rejected = 0;
  const errors = {};

  const batches = TOTAL_JOBS / BATCH_SIZE;

  for (let batch = 0; batch < batches; batch++) {
    const results = await sendBatch(batch);

    results.forEach((r) => {
      if (r.status === 503 || (r.error && r.error.includes("busy"))) {
        rejected++;
      } else if (r.jobId) {
        success++;
      } else {
        failed++;
        const errMsg = r.error || "unknown";
        errors[errMsg] = (errors[errMsg] || 0) + 1;
      }
    });

    if (batch % 20 === 0) {
      try {
        const res = await fetch(`${BASE_URL}/queue/stats`);
        const stats = await res.json();
        console.log(
          `Batch ${batch}/${batches}: OK=${success}, 503=${rejected}, FAIL=${failed} | Queue: wait=${stats.waiting}, active=${stats.active}`
        );
      } catch (e) {
        console.log(`Batch ${batch}/${batches}: OK=${success}, 503=${rejected}, FAIL=${failed}`);
      }
    }

    await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
  }

  const duration = (Date.now() - start) / 1000;
  console.log(`\n=== Results ===`);
  console.log(`Total: ${TOTAL_JOBS}`);
  console.log(`Success (queued): ${success}`);
  console.log(`Rejected (503 backpressure): ${rejected}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Throughput: ${(success / duration).toFixed(2)} jobs/s`);
  
  if (Object.keys(errors).length > 0) {
    console.log(`\nError breakdown:`);
    Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([err, count]) => {
      console.log(`  ${err}: ${count}`);
    });
  }
}

main().catch(console.error);
