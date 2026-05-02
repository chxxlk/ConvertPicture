import { spawn } from "bun";

let redisProc: ReturnType<typeof spawn> | null = null;
let workerProc: ReturnType<typeof spawn> | null = null;
let backendProc: ReturnType<typeof spawn> | null = null;
let isStopping = false;
let redisReady = false;

function readStream(stream: any, prefix: string) {
  if (!stream || typeof stream === 'number') return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        text.split('\n').filter(Boolean).forEach(line => {
          console.log(`${prefix} ${line}`);
        });
      }
    } catch (e) {
      // Stream closed
    }
  })();
}

async function checkRedis(): Promise<boolean> {
  try {
    const redisHost = process.env.REDIS_HOST || "127.0.0.1";
    const redisPort = process.env.REDIS_PORT || "6379";
    const proc = spawn(["redis-cli", "-h", redisHost, "-p", redisPort, "PING"], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PATH: "/usr/bin:/usr/local/bin:" + (process.env.PATH || "") }
    });
    const result = await Promise.race([
      proc.exited,
      new Promise(resolve => setTimeout(() => resolve(-1), 2000))
    ]);
    return result === 0;
  } catch (e) {
    return false;
  }
}

// Start Redis only if not running
async function startRedis() {
  const alreadyRunning = await checkRedis();
  if (alreadyRunning) {
    console.log("[Redis] Already running, skipping start");
    redisReady = true;
    return;
  }

  console.log("[Redis] Starting...");
  redisProc = spawn(["redis-server", "--appendonly", "yes", "--daemonize", "yes"], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, PATH: "/usr/bin:/usr/local/bin:" + (process.env.PATH || "") }
  });

  readStream(redisProc.stderr, "[Redis]");

  redisProc.exited.then(async (code) => {
    console.log(`[Redis] Exited with code ${code}`);
    redisProc = null;
    
    if (code === 0) {
      // Wait for Redis to be ready
      for (let i = 0; i < 20; i++) {
        if (await checkRedis()) {
          console.log("[Redis] Ready");
          redisReady = true;
          return;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    redisReady = false;
    if (!isStopping) {
      console.log("[Redis] Restarting in 5s...");
      setTimeout(startRedis, 5000);
    }
  });
}

// Start Worker with auto-restart
function startWorker() {
  if (isStopping) return;
  if (!redisReady) {
    console.log("[Worker] Waiting for Redis...");
    setTimeout(startWorker, 2000);
    return;
  }

  console.log("[Worker] Starting...");
  workerProc = spawn(["bun", "--expose-gc", "src/queue/worker.ts"], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NODE_ENV: "production" },
  });

  readStream(workerProc.stdout, "[Worker]");
  readStream(workerProc.stderr, "[Worker]");

  workerProc.exited.then((code) => {
    console.log(`[Worker] Exited with code ${code}`);
    workerProc = null;
    if (!isStopping && code !== 0) {
      console.log("[Worker] Restarting in 5s...");
      setTimeout(startWorker, 5000);
    }
  });
}

// Start Backend with auto-restart
function startBackend() {
  if (isStopping) return;
  if (!redisReady) {
    console.log("[Backend] Waiting for Redis...");
    setTimeout(startBackend, 2000);
    return;
  }

  console.log("[Backend] Starting...");
  backendProc = spawn(["bun", "run", "index.ts"], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NODE_ENV: "production" },
  });

  readStream(backendProc.stdout, "[Backend]");
  readStream(backendProc.stderr, "[Backend]");

  backendProc.exited.then((code) => {
    console.log(`[Backend] Exited with code ${code}`);
    backendProc = null;
    if (!isStopping && code !== 0) {
      console.log("[Backend] Restarting in 5s...");
      setTimeout(startBackend, 5000);
    }
  });
}

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down...");
  isStopping = true;

  backendProc?.kill();
  workerProc?.kill();
  redisProc?.kill();

  setTimeout(() => {
    backendProc?.kill("SIGKILL");
    workerProc?.kill("SIGKILL");
    redisProc?.kill("SIGKILL");
    process.exit(0);
  }, 5000);
});

// Start all services
startRedis().then(() => {
  if (redisReady) {
    startWorker();
    startBackend();
  }
});

console.log("[Server] All services starting...");
console.log("[Server] Press Ctrl+C to stop");
