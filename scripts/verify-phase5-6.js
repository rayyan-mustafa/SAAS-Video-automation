const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Phase 5 & 6 Verification Gate...\n');

// 1. Verify LandingPage.tsx
console.log('--- Step 1: Landing Page Light-Modern Verification ---');
const landingPath = path.join(__dirname, '..', 'src', 'components', 'LandingPage.tsx');
const landingContent = fs.readFileSync(landingPath, 'utf8');
assert.ok(landingContent.includes('radial-gradient'), 'LandingPage must include light radial-gradient background');
assert.ok(landingContent.includes('300 free trial credits'), 'LandingPage must feature 300 free trial credits');
assert.ok(landingContent.includes('AUTONOMOUS AI VIDEO AGENT v3.0'), 'LandingPage must feature v3.0 branding');
console.log('✅ Landing Page Light-Modern verification PASS\n');

// 2. Verify Dashboard Hero Prompt Hub
console.log('--- Step 2: Dashboard Hero Prompt Hub Verification ---');
const dashboardPath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
assert.ok(dashboardContent.includes('What video will you create today'), 'Dashboard must include personalized hero greeting');
assert.ok(dashboardContent.includes('QuickStartChips'), 'Dashboard must render QuickStartChips');
assert.ok(dashboardContent.includes('Generate Video'), 'Dashboard must have Generate Video action');
console.log('✅ Dashboard Hero Prompt Hub verification PASS\n');

// 3. Verify AppShell.tsx Light Sidebar & Topbar
console.log('--- Step 3: AppShell Light Sidebar & Topbar Verification ---');
const appshellPath = path.join(__dirname, '..', 'src', 'components', 'AppShell.tsx');
const appshellContent = fs.readFileSync(appshellPath, 'utf8');
assert.ok(appshellContent.includes('#FAF7FF'), 'AppShell must feature ultra-light #FAF7FF sidebar');
assert.ok(appshellContent.includes('#EDE9FE'), 'AppShell must feature fine #EDE9FE borders');
assert.ok(appshellContent.includes('#6D28D9'), 'AppShell must feature purple active nav state');
assert.ok(appshellContent.includes('Credits'), 'AppShell topbar must include credit balance badge');
console.log('✅ AppShell Light Sidebar & Topbar verification PASS\n');

// 4. Verify Multi-Accent Voice Catalog (Phase 6)
console.log('--- Step 4: Multi-Accent Voice Catalog Verification ---');
const voicePath = path.join(__dirname, '..', 'src', 'lib', 'video', 'voiceCatalog.ts');
const voiceContent = fs.readFileSync(voicePath, 'utf8');
assert.ok(voiceContent.includes('google-neural2-us'), 'Voice catalog must contain US American accent');
assert.ok(voiceContent.includes('google-neural2-gb'), 'Voice catalog must contain British UK accent');
assert.ok(voiceContent.includes('google-neural2-au'), 'Voice catalog must contain Australian accent');
assert.ok(voiceContent.includes('google-neural2-in'), 'Voice catalog must contain Indian English accent');
assert.ok(voiceContent.includes('el-adam-viral'), 'Voice catalog must contain Adam Pro narrator');
assert.ok(voiceContent.includes('el-rachel-story'), 'Voice catalog must contain Rachel Pro narrator');
console.log('✅ Multi-Accent Voice Catalog verification PASS\n');

console.log('🎉 ALL PHASE 5 & 6 VERIFICATION CHECKS PASSED 100%!');
