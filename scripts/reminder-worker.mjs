const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const cronToken = process.env.REMINDER_CRON_TOKEN?.trim();
const intervalMs = Number(process.env.REMINDER_WORKER_INTERVAL_MS || 5 * 60 * 1000);

if (!cronToken) {
  console.error("[reminder-worker] REMINDER_CRON_TOKEN is required");
  process.exit(1);
}

async function sweep() {
  const response = await fetch(`${appUrl}/api/reminders/appointments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronToken}`,
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }

  console.log("[reminder-worker] sweep ok", JSON.stringify(json));
}

async function loop() {
  try {
    await sweep();
  } catch (error) {
    console.error("[reminder-worker] sweep failed", error instanceof Error ? error.message : error);
  }

  setTimeout(loop, intervalMs).unref?.();
}

console.log(`[reminder-worker] started with interval ${intervalMs}ms`);
void loop();
