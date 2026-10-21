import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

export async function runWp1Migration(customDbPath?: string): Promise<{
  success: boolean;
  backupPath?: string;
  migratedProjectsCount: number;
  migratedJobsCount: number;
}> {
  const dbPath = customDbPath || path.join(process.cwd(), 'data', 'app.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at: ${dbPath}`);
  }

  // 1. Automated Database Backup before migration
  const backupsDir = path.join(path.dirname(dbPath), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const backupFilename = `app.db.bak.${Date.now()}`;
  const backupPath = path.join(backupsDir, backupFilename);
  await fs.promises.copyFile(dbPath, backupPath);
  console.log(`[Migration WP1] ✅ Database backed up to: ${backupPath}`);

  // 2. Open DB and run non-destructive migration
  const db = new Database(dbPath);
  try {
    // Schema safe columns
    const columns = db.pragma("table_info(video_scenes)") as Array<{ name: string }>;
    const colNames = new Set(columns.map((c) => c.name));

    if (!colNames.has('audio_storage_key')) {
      db.exec("ALTER TABLE video_scenes ADD COLUMN audio_storage_key TEXT;");
    }
    if (!colNames.has('audio_duration_sec')) {
      db.exec("ALTER TABLE video_scenes ADD COLUMN audio_duration_sec REAL;");
    }
    if (!colNames.has('visual_tier')) {
      db.exec("ALTER TABLE video_scenes ADD COLUMN visual_tier TEXT DEFAULT 'motion_still';");
    }

    // 3. Non-destructive migration of in-flight projects:
    // SCRIPT -> PLAN for active in-flight jobs only.
    // NEVER delete historical records (preserves full audit & refund trail).
    const projectCols = db.pragma("table_info(content_projects)") as Array<{ name: string }>;
    const projectColNames = new Set(projectCols.map((c) => c.name));
    const projectUpdateResult = projectColNames.has('updated_at')
      ? db.prepare(`
          UPDATE content_projects 
          SET current_stage = 'PLAN', updated_at = ?
          WHERE current_stage = 'SCRIPT' AND status IN ('PENDING', 'PROCESSING')
        `).run(new Date().toISOString())
      : db.prepare(`
          UPDATE content_projects 
          SET current_stage = 'PLAN'
          WHERE current_stage = 'SCRIPT' AND status IN ('PENDING', 'PROCESSING')
        `).run();

    const jobsUpdateResult = db.prepare(`
      UPDATE video_jobs 
      SET stage = 'PLAN'
      WHERE stage = 'SCRIPT' AND status IN ('PENDING', 'PROCESSING')
    `).run();

    console.log(`[Migration WP1] ✅ Migrated ${projectUpdateResult.changes} in-flight projects from SCRIPT to PLAN.`);
    console.log(`[Migration WP1] ✅ Migrated ${jobsUpdateResult.changes} active jobs to PLAN.`);
    console.log(`[Migration WP1] ✅ Historical SCRIPT jobs preserved for audit integrity.`);

    return {
      success: true,
      backupPath,
      migratedProjectsCount: projectUpdateResult.changes,
      migratedJobsCount: jobsUpdateResult.changes,
    };
  } finally {
    db.close();
  }
}

export const runMigration = runWp1Migration;

// Direct CLI execution
if (require.main === module) {
  runWp1Migration()
    .then((res) => {
      console.log('[Migration WP1] Completed successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration WP1] Fatal error:', err);
      process.exit(1);
    });
}
