/**
 * After Turbopack is Ready, warm only high-traffic routes.
 * Full-catalog warm takes 10–15+ min on Windows; keep this short.
 */
const PORT = Number(process.env.PORT ?? 3000);
const BASE = `http://127.0.0.1:${PORT}`;

/** Home + workstation shortcuts — enough for typical first clicks. */
const ROUTES = [
  "/",
  "/calculator/flange-dimension-weight",
  "/calculator/pipe-schedule-dimension",
  "/calculator/gasket-dimension-selection",
  "/calculator/fitting-valve-dimension",
  "/calculator/bolt-torque-tensioning",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(800);
  }
  return false;
}

async function main() {
  // Opt-in only — background warm competes with Cursor/HMR and slows first prompts.
  if (process.env.FEK_WARM !== "1") {
    return;
  }

  const ready = await waitForServer();
  if (!ready) {
    console.warn("[warm] Server not ready — skip route warm");
    return;
  }

  console.log("[warm] Compiling top routes (≈1–3 min)…");
  for (const path of ROUTES) {
    try {
      await fetch(`${BASE}${path}`, { redirect: "manual" });
      process.stdout.write(".");
    } catch {
      process.stdout.write("x");
    }
    await sleep(100);
  }
  console.log("\n[warm] Done — other pages compile on first visit / hover.");
}

main().catch((error) => {
  console.warn("[warm]", error?.message ?? error);
});
