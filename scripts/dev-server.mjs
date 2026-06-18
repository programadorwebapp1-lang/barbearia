import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

const port = process.env.PORT || "3000";
const nextBin = path.resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
  cwd: process.cwd(),
});

let warmed = false;
let readySeen = false;

async function warmRoutes() {
  if (warmed) return;
  warmed = true;
  await delay(800);

  const routes = ["/admin", "/admin/financeiro", "/login"];
  for (const route of routes) {
    try {
      await fetch(`http://127.0.0.1:${port}${route}`, { redirect: "manual" });
    } catch {
      // Best-effort warmup only.
    }
  }
}

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString();
  if (!readySeen && /Ready in|started server on/i.test(text)) {
    readySeen = true;
    void warmRoutes();
  }
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

const shutdown = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
