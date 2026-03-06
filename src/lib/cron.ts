import * as cron from "node-cron";
import { runAllChecks } from "./checker";

let task: ReturnType<typeof cron.schedule> | null = null;

export function startCronJob(intervalMinutes = 30): void {
  if (task) task.stop();

  task = cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
    console.log(`[CRON] Starting check at ${new Date().toISOString()}`);
    try {
      await runAllChecks();
    } catch (error) {
      console.error("[CRON] Check failed:", error);
    }
    console.log(`[CRON] Check complete`);
  });

  console.log(
    `[CRON] Scheduler started, checking every ${intervalMinutes} minutes`
  );

  // Run first check after 10 seconds delay (let server finish startup)
  setTimeout(() => {
    runAllChecks().catch((err) =>
      console.error("[CRON] Initial check failed:", err)
    );
  }, 10000);
}
