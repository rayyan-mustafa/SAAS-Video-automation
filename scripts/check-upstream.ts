/**
 * Automated Upstream Intelligence & Change Detection Engine
 *
 * Checks https://github.com/saninabbas/youtube-automation- for new commits,
 * parses technical diffs, categorizes affected systems, and logs developer
 * dossiers for founder review before code integration.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface UpstreamSyncConfig {
  upstream_repo: string;
  last_synced_commit: string;
  last_synced_at: string;
  tracked_branches: string[];
}

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err: any) {
    if (err.stdout) return err.stdout.toString().trim();
    return '';
  }
}

async function main() {
  console.log('================================================================');
  console.log('   AUTORA UPSTREAM INTELLIGENCE: AUTOMATED CHANGE AUDITOR       ');
  console.log('================================================================\n');

  const configPath = path.join(process.cwd(), '.upstream-sync.json');
  if (!fs.existsSync(configPath)) {
    console.error('[Error] .upstream-sync.json not found!');
    process.exit(1);
  }

  const config: UpstreamSyncConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const upstreamRepo = config.upstream_repo;
  const lastSyncedSha = config.last_synced_commit;

  // 1. Ensure upstream remote exists and has push disabled
  const remotes = run('git remote -v');
  if (!remotes.includes('upstream')) {
    console.log(`[Config] Adding upstream remote: ${upstreamRepo}`);
    run(`git remote add upstream ${upstreamRepo}`);
  }
  run('git remote set-url --push upstream DISABLE');

  // 2. Fetch upstream
  console.log('[Fetch] Fetching latest refs from upstream...');
  run('git fetch upstream');

  // 3. Inspect latest commit
  const latestSha = run('git rev-parse upstream/main');
  if (!latestSha) {
    console.error('[Error] Could not resolve upstream/main.');
    process.exit(1);
  }

  console.log(`[Status] Last Synced Commit : ${lastSyncedSha.slice(0, 7)}`);
  console.log(`[Status] Upstream Head Commit: ${latestSha.slice(0, 7)}`);

  if (latestSha === lastSyncedSha) {
    console.log('\n✅ [ALL CLEAR] Upstream is up to date. No new commits detected.');
    return;
  }

  // 4. Retrieve commit log & diff between last synced commit and latest upstream
  console.log('\n🔍 [ALERT] New upstream commits detected! Analyzing technical changes...');

  const commitLogRaw = run(`git log ${lastSyncedSha}..${latestSha} --pretty=format:"%h|%an|%ad|%s" --date=short`);
  const commitLines = commitLogRaw ? commitLogRaw.split('\n').filter(Boolean) : [];
  const commitCount = commitLines.length;

  const diffStat = run(`git diff --stat ${lastSyncedSha}..${latestSha}`);
  const changedFilesRaw = run(`git diff --name-status ${lastSyncedSha}..${latestSha}`);
  const changedFiles = changedFilesRaw ? changedFilesRaw.split('\n').filter(Boolean) : [];

  // Categorize affected systems
  const categories = {
    database: [] as string[],
    videoEngine: [] as string[],
    adminSecurity: [] as string[],
    frontendUi: [] as string[],
    testsAndTooling: [] as string[],
    configuration: [] as string[],
    other: [] as string[],
  };

  for (const line of changedFiles) {
    const [status, filePath] = line.split(/\s+/);
    if (!filePath) continue;

    const entry = `${status}: ${filePath}`;
    if (filePath.includes('src/lib/db') || filePath.endsWith('.sql')) {
      categories.database.push(entry);
    } else if (filePath.includes('src/lib/video') || filePath.includes('src/lib/providers') || filePath.includes('ffmpeg')) {
      categories.videoEngine.push(entry);
    } else if (filePath.includes('admin') || filePath.includes('security') || filePath.includes('auth')) {
      categories.adminSecurity.push(entry);
    } else if (filePath.startsWith('src/app') || filePath.startsWith('src/components')) {
      categories.frontendUi.push(entry);
    } else if (filePath.startsWith('tests') || filePath.startsWith('scripts')) {
      categories.testsAndTooling.push(entry);
    } else if (filePath.includes('package.json') || filePath.includes('tsconfig') || filePath.startsWith('.')) {
      categories.configuration.push(entry);
    } else {
      categories.other.push(entry);
    }
  }

  // Build Markdown Dossier
  const now = new Date().toISOString();
  const shortNewSha = latestSha.slice(0, 7);
  const shortOldSha = lastSyncedSha.slice(0, 7);

  const report = [
    `## 🔔 [Pending Review] Upstream Batch: ${shortOldSha}...${shortNewSha} (${commitCount} new commit${commitCount === 1 ? '' : 's'})`,
    `- **Detected At**: ${now}`,
    `- **Commit Range**: \`${lastSyncedSha}\` ... \`${latestSha}\``,
    `- **Total Files Changed**: ${changedFiles.length}`,
    '',
    '### 📜 New Upstream Commits:',
    '| Hash | Author | Date | Message |',
    '| :--- | :--- | :--- | :--- |',
    ...commitLines.map((c) => {
      const [h, author, date, ...msgParts] = c.split('|');
      return `| \`${h}\` | ${author} | ${date} | ${msgParts.join('|')} |`;
    }),
    '',
    '### 🧩 Affected Architectural Modules:',
    ...(categories.database.length ? [`#### 📦 Database & Schema Changes (${categories.database.length})\n\`\`\`text\n${categories.database.join('\n')}\n\`\`\``] : []),
    ...(categories.videoEngine.length ? [`#### 🎬 Core Video Engine & Providers (${categories.videoEngine.length})\n\`\`\`text\n${categories.videoEngine.join('\n')}\n\`\`\``] : []),
    ...(categories.adminSecurity.length ? [`#### 🛡️ Admin & Security Infrastructure (${categories.adminSecurity.length})\n\`\`\`text\n${categories.adminSecurity.join('\n')}\n\`\`\``] : []),
    ...(categories.frontendUi.length ? [`#### 🎨 Frontend UI & Pages (${categories.frontendUi.length})\n\`\`\`text\n${categories.frontendUi.join('\n')}\n\`\`\``] : []),
    ...(categories.testsAndTooling.length ? [`#### 🧪 Tests & Tooling (${categories.testsAndTooling.length})\n\`\`\`text\n${categories.testsAndTooling.join('\n')}\n\`\`\``] : []),
    ...(categories.configuration.length ? [`#### ⚙️ Configuration & Environment (${categories.configuration.length})\n\`\`\`text\n${categories.configuration.join('\n')}\n\`\`\``] : []),
    ...(categories.other.length ? [`#### 📄 Other Files (${categories.other.length})\n\`\`\`text\n${categories.other.join('\n')}\n\`\`\``] : []),
    '',
    '### 📊 Diff Summary:',
    '```text',
    diffStat,
    '```',
    '',
    '### 🛠️ Developer Integration Commands (Run only after Founder Approval):',
    '```bash',
    '# 1. To inspect individual file diffs:',
    `git diff ${lastSyncedSha}..upstream/main -- <path/to/file>`,
    '',
    '# 2. To selectively import specific verified folders/files:',
    'git checkout upstream/main -- <path/to/folder>',
    '',
    '# 3. To update sync cursor once approved and committed:',
    `# Update .upstream-sync.json with last_synced_commit = "${latestSha}"`,
    '```',
    '---',
    '',
  ].join('\n');

  // 5. Append to UPSTREAM_LOGS.md
  const logPath = path.join(process.cwd(), 'UPSTREAM_LOGS.md');
  if (fs.existsSync(logPath)) {
    fs.appendFileSync(logPath, '\n' + report, 'utf8');
    console.log(`[Log] Appended technical analysis to ${logPath}`);
  }

  // 6. Output to console
  console.log('\n' + report);

  // 7. If running in GitHub Actions, create an automated GitHub Issue
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_TOKEN) {
    try {
      console.log('[CI] Creating automated GitHub Issue for founder notification...');
      const repoEnv = process.env.GITHUB_REPOSITORY; // e.g. "rayyan-mustafa/SAAS-Video-automation"
      if (repoEnv) {
        const title = `🔔 [Upstream Alert] ${commitCount} New Commits in Sanin's Repo (${shortNewSha})`;
        const issueBody = JSON.stringify({
          title,
          body: report,
          labels: ['upstream-sync', 'audit-required'],
        });

        const res = await fetch(`https://api.github.com/repos/${repoEnv}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Autora-Upstream-Bot',
          },
          body: issueBody,
        });

        if (res.ok) {
          const issueData = await res.json() as any;
          console.log(`[CI] Created GitHub Issue #${issueData.number}: ${issueData.html_url}`);
        } else {
          const errText = await res.text();
          console.warn(`[CI] Could not create issue: ${res.status} - ${errText}`);
        }
      }
    } catch (ciErr: any) {
      console.warn(`[CI] Issue creation error: ${ciErr.message}`);
    }
  }
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
