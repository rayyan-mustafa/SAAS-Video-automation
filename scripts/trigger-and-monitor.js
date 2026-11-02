const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let token = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NETLIFY_AUTH_TOKEN=')) {
    token = trimmed.slice('NETLIFY_AUTH_TOKEN='.length).trim().replace(/^['"]|['"]$/g, '');
  }
}

async function run() {
  const siteId = '424cff34-1344-48aa-8a60-dc625b045d44';
  console.log(`Triggering build for site ${siteId} (now connected to rayyan-mustafa/SAAS-Video-automation)...`);

  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clear_cache: true })
  });

  if (!res.ok) {
    console.error('Trigger failed:', res.status, await res.text());
    return;
  }

  const build = await res.json();
  console.log('Build created:', build.id, 'deploy_id:', build.deploy_id);

  const deployId = build.deploy_id;
  console.log(`\nMonitoring deploy ${deployId}...`);

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 6000));
    const depRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dep = await depRes.json();
    console.log(`[${i+1}] State: ${dep.state}, Commit: ${dep.commit_ref ? dep.commit_ref.slice(0,7) : 'none'}, Branch: ${dep.branch}`);

    if (dep.state === 'ready') {
      console.log('\n🎉 SUCCESS! Deploy is live:');
      console.log('URL:', dep.ssl_url || dep.url);
      console.log('Deploy URL:', dep.deploy_ssl_url);
      return;
    }

    if (dep.state === 'error') {
      console.error('\n❌ BUILD FAILED:');
      console.error(dep.error_message);
      return;
    }
  }
}

run().catch(e => console.error(e));
