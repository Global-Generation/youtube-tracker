export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJob } = await import("./src/lib/cron");
    startCronJob();
  }
}
