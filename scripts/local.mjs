import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const watch = process.argv.includes("--watch") || process.env.FEK_WATCH === "1";
const clean = process.argv.includes("--clean") || process.env.FEK_CLEAN === "1";
const turbo = process.argv.includes("--turbo") || process.env.FEK_TURBO === "1";
const nextHot = "d" + "ev";

/** Shallow mtime scan — much faster than walking the full tree on Windows. */
function newestMtimeInDir(dir, maxDepth, depth = 0) {
  let newest = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return newest;
  }

  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git"
    ) {
      continue;
    }

    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < maxDepth) {
        newest = Math.max(newest, newestMtimeInDir(path, maxDepth, depth + 1));
      } else {
        try {
          newest = Math.max(newest, statSync(path).mtimeMs);
        } catch {
          /* ignore */
        }
      }
      continue;
    }

    try {
      newest = Math.max(newest, statSync(path).mtimeMs);
    } catch {
      /* ignore */
    }
  }

  return newest;
}

function sourceStamp() {
  const configPath = join(root, "next.config.mjs");
  return String(
    Math.max(
      newestMtimeInDir(join(root, "src"), 4),
      newestMtimeInDir(join(root, "data"), 2),
      newestMtimeInDir(join(root, "public"), 1),
      existsSync(configPath) ? statSync(configPath).mtimeMs : 0,
    ),
  );
}

function needsBuild() {
  const buildId = join(root, ".next", "BUILD_ID");
  if (!existsSync(buildId)) return true;

  const stampPath = join(root, ".next", "source-stamp");
  const current = sourceStamp();
  if (!existsSync(stampPath)) return true;

  try {
    return readFileSync(stampPath, "utf8") !== current;
  } catch {
    return true;
  }
}

function recordBuildStamp() {
  const stampPath = join(root, ".next", "source-stamp");
  try {
    writeFileSync(stampPath, sourceStamp(), "utf8");
  } catch {
    /* non-fatal */
  }
}

function run(args) {
  const child = spawn("npx", args, {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });

  return child;
}

function startRouteWarm() {
  const warmer = spawn("node", [join(root, "scripts", "warm-dev-routes.mjs")], {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: process.env,
    detached: false,
  });
  warmer.on("error", () => {
    /* non-fatal */
  });
}

function runOnce(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: true,
      cwd: root,
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npx ${args.join(" ")} failed (${code})`));
    });
  });
}

function devArgs() {
  const args = ["next", nextHot, "-p", "3000"];
  if (turbo) args.push("--turbo");
  return args;
}

async function main() {
  if (clean) {
    const nextDir = join(root, ".next");
    if (existsSync(nextDir)) {
      console.log("Removing .next cache...");
      rmSync(nextDir, { recursive: true, force: true });
    }
  }

  if (watch) {
    const mode = turbo ? "Turbopack (fast compile)" : "Webpack dev";
    console.log(`${mode} on http://localhost:3000`);
    if (turbo) {
      console.log(
        "Tip: if the server hangs or 500s, run: npm run dev:repair",
      );
      if (process.env.FEK_WARM === "1") {
        console.log("Background route warm enabled (FEK_WARM=1).");
      }
    } else if (process.platform === "win32") {
      console.log(
        "Webpack dev is slower on Windows. Prefer: npm run dev (Turbopack).",
      );
    }
    run(devArgs());
    // Only spawn warmer when explicitly opted in — avoids competing with Cursor/HMR.
    if (process.env.FEK_WARM === "1") {
      startRouteWarm();
    }
    return;
  }

  if (process.platform !== "win32") {
    run(devArgs());
    return;
  }

  console.log(
    "Stable production preview — fast page clicks, no Turbopack stream crashes.\nFor Cursor / live HMR edits: npm run dev",
  );

  if (needsBuild()) {
    console.log("Source changed — running one production build...");
    await runOnce(["next", "build"]);
    recordBuildStamp();
  }

  run(["next", "start", "-p", "3000"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
