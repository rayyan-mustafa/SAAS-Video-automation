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

async function monitorLatest() {
  const siteId = '424cff34-1344-48aa-8a60-dc625b045d44';

  console.log('Fetching latest deploy on Netlify...');
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const deploys = await res.json();
  const latest = deploys[0];
  console.log('Deploy ID:', latest.id, 'State:', latest.state, 'Commit:', latest.commit_ref ? latest.commit_ref.slice(0,7) : 'none');

  const deployId = latest.id;
  for (let i = 0; i < 40; i++) {
    const depRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dep = await depRes.json();
    console.log(`[Attempt ${i+1}] State: ${dep.state}, Commit: ${dep.commit_ref ? dep.commit_ref.slice(0,7) : 'none'}, Branch: ${dep.branch}`);

    if (dep.state === 'ready') {
      console.log('\n🎉 SUCCESS! Deploy is LIVE:');
      console.log('URL:', dep.ssl_url || dep.url);
      console.log('Deploy URL:', dep.deploy_ssl_url);
      return;
    }

    if (dep.state === 'error') {
      console.error('\n❌ BUILD FAILED:');
      console.error(dep.error_message);
      return;
    }

    await new Promise(r => setTimeout(r, 6000));
  }
}

monitorLatest().catch(e => console.error(e));
