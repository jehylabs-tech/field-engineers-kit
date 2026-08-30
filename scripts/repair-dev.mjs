/**
 * Fix a broken local dev server on Windows (port lock / corrupted .next).
 * Usage: npm run dev:repair [-- --start]
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 3000);
const restart = process.argv.includes("--start");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pidsOnPortWindows(targetPort) {
  const pids = new Set();
  const portToken = `:${targetPort}`;

  try {
    const out = execSync("netstat -ano", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;
      if (!trimmed.includes(portToken)) continue;
      // Avoid matching :30000 when looking for :3000
      const match = trimmed.match(new RegExp(`${portToken}(\\D|$)`));
      if (!match) continue;
      const parts = trimmed.split(/\s+/);
      const pid = Number(parts.at(-1));
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
  } catch {
    /* no matches */
  }

  return pids;
}

function killPidWindows(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
    console.log(`Stopped process ${pid} on port ${port}`);
    return true;
  } catch {
    return false;
  }
}

async function killPortWindows(targetPort) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const pids = pidsOnPortWindows(targetPort);
    if (pids.size === 0) {
      if (attempt === 1) console.log(`No listener on port ${targetPort}`);
      return;
    }

    for (const pid of pids) {
      killPidWindows(pid);
    }

    await sleep(800);
  }
}

function killPortUnix(targetPort) {
  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9`, {
      stdio: "ignore",
    });
    console.log(`Stopped processes on port ${targetPort}`);
  } catch {
    console.log(`No listener on port ${targetPort}`);
  }
}

function portInUseWindows(targetPort) {
  return pidsOnPortWindows(targetPort).size > 0;
}

async function waitForPortFree(targetPort, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (process.platform === "win32") {
      if (!portInUseWindows(targetPort)) return true;
    } else {
      try {
        execSync(`lsof -ti:${targetPort}`, { stdio: "ignore" });
      } catch {
        return true;
      }
    }
    await sleep(400);
  }
  return false;
}

function cleanNext() {
  const nextDir = join(root, ".next");
  if (!existsSync(nextDir)) {
    console.log(".next already absent");
    return;
  }
  console.log("Removing .next cache...");
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next");
}

function startDev() {
  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  console.log("Repairing local dev environment...\n");

  if (process.platform === "win32") {
    await killPortWindows(port);
  } else {
    killPortUnix(port);
    await sleep(800);
  }

  cleanNext();

  console.log("\nDone. Start the server with: npm run dev");

  if (!restart) return;

  const free = await waitForPortFree(port);
  if (!free) {
    console.error(
      `\nPort ${port} is still in use. Close the other process manually, then run: npm run dev`,
    );
    process.exit(1);
  }

  console.log("Starting dev server...\n");
  startDev();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
