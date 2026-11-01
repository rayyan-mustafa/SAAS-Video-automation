import * as fs from "fs";
import * as path from "path";

// Load .env into process.env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

import { tasks } from "@trigger.dev/sdk";
import type { renderVideoTask } from "../src/trigger/videoRender";

async function main() {
  console.log("Triggering render-video-task on Trigger.dev Cloud...");
  const handle = await tasks.trigger<typeof renderVideoTask>("render-video-task", {
    projectId: "demo-proj-001",
    userId: "rayyan-2312335",
    title: "10 Mind-Bending Space Mysteries",
    durationSeconds: 45,
    aspectRatio: "9:16",
    scenes: [
      {
        sceneNumber: 1,
        text: "What lies beyond the observable universe?",
        visualTier: "stock",
      },
      {
        sceneNumber: 2,
        text: "Black holes warp spacetime so violently that time stops.",
        visualTier: "motion_still",
      },
    ],
  });

  console.log("Task triggered successfully! Run ID:", handle.id);
  console.log("Run URL:", `https://cloud.trigger.dev/orgs/university-szabist-8832/projects/tillercast-videosaas-ZxP7/runs/${handle.id}`);
}

main().catch((err) => {
  console.error("Trigger error:", err);
  process.exit(1);
});
