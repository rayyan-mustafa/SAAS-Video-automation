import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_jevvljclovipwehpazib",
  runtime: "node",
  logLevel: "log",
  // The max duration (in seconds) for all tasks in this project
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});

