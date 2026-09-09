import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function testEndpoint() {
  console.log('Testing /api/queue/schedule-test-1min endpoint...');

  const payload = {
    to: 'vishalni2005@gmail.com',
    name: 'Hiring Team',
    company: 'Upstash Inc.',
    catName: 'Full-Stack Developer',
    website: 'https://upstash.com',
    delaySeconds: 60,
    customInstructions: 'Testing 1-minute QStash delay delivery with Mistral AI model rotation and resume attachment.'
  };

  try {
    const res = await fetch('http://localhost:3000/api/queue/schedule-test-1min', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('\n--- /api/queue/schedule-test-1min Response ---');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ 1-Minute Upstash QStash Test Scheduling verified successfully!');
      console.log(`   Message ID: ${data.messageId}`);
      console.log(`   Scheduled Execution: ${data.scheduledFor} (${data.delaySeconds}s delay)`);
    } else {
      console.error('❌ Failed:', data.error);
    }
  } catch (err) {
    console.error('❌ Request error:', err.message);
  }
}

testEndpoint();
