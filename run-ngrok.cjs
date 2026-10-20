const ngrok = require('@ngrok/ngrok');

async function start() {
  try {
    const listener = await ngrok.forward({
      addr: 3000,
      authtoken: '3InwBnGeGW7zZsJ0FeH3NdtH4VG_42SzcViTBGGWQLQjwRjP8'
    });
    console.log(`=== SUCCESS ===`);
    console.log(`LIVE_URL: ${listener.url()}`);
    console.log(`===============`);
  } catch (err) {
    console.error('Ngrok error:', err);
  }
}

start();
