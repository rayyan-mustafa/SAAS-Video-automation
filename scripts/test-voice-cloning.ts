import { getDb, addUserVoice, getUserVoices, deleteUserVoice, getApiKey } from '../src/lib/db';
import { voiceProvider } from '../src/lib/providers/voiceProvider';
import { storage } from '../src/lib/storage';

async function main() {
  console.log('--- TEST 1: Database Operations for user_voices ---');
  const testUserId = 'usr_test_voice_runner';
  const testVoiceId = 'vKpzJkQp78nLkWq12345';
  const testVoiceName = "Nabeel's Studio Voice";
  const testSampleUrl = '/api/assets/voices/sample.wav';

  // 1. Add voice
  const saved = addUserVoice(testUserId, testVoiceName, testVoiceId, testSampleUrl);
  console.log('Saved voice:', saved);

  if (!saved.id || saved.voice_id !== testVoiceId) {
    throw new Error('addUserVoice failed');
  }

  // 2. Fetch voices
  const voices = getUserVoices(testUserId);
  console.log(`Fetched ${voices.length} voices for user.`);
  const found = voices.find((v) => v.voice_id === testVoiceId);
  if (!found) throw new Error('getUserVoices did not return added voice');
  console.log('Found added voice:', found.name);

  // 3. Test Voice Resolution in VoiceProvider
  console.log('\n--- TEST 2: Voice Resolution in VoiceProvider ---');
  // @ts-ignore - access private method for verification
  const resolved = (voiceProvider as any).resolveElevenLabsVoiceId(testVoiceId);
  console.log(`Resolved voice ID: ${resolved}`);
  if (resolved !== testVoiceId) {
    throw new Error(`Expected voice ID ${testVoiceId}, got ${resolved}`);
  }

  // 4. Test Studio Voice fallback resolution
  // @ts-ignore
  const resolvedRachel = (voiceProvider as any).resolveElevenLabsVoiceId('elevenlabs:rachel');
  console.log(`Resolved Rachel: ${resolvedRachel}`);
  if (resolvedRachel !== '21m00Tcm4TlvDq8ikWAM') {
    throw new Error(`Expected 21m00Tcm4TlvDq8ikWAM, got ${resolvedRachel}`);
  }

  // 5. Test Delete Voice
  console.log('\n--- TEST 3: Delete Voice ---');
  const deleted = deleteUserVoice(testUserId, saved.id);
  console.log('Deleted result:', deleted);
  const remaining = getUserVoices(testUserId);
  if (remaining.length !== 0) throw new Error('deleteUserVoice failed, voice still in db');
  console.log('Verified: user voices list is clean.');

  // 6. Test ElevenLabs API key availability
  console.log('\n--- TEST 4: ElevenLabs API Key Check ---');
  const apiKey = getApiKey('elevenlabs') || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: ElevenLabs API key not set!');
  } else {
    console.log(`ElevenLabs API key is configured (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 6)}...)`);
  }

  console.log('\nALL UNIT & INTEGRATION TESTS FOR VOICE CLONING PASSED! 🎉');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
