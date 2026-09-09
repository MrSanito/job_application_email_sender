import fs from 'fs';
import path from 'path';
import { Client as QStashClient } from '@upstash/qstash';

// Helper to clean quotes
function cleanEnv(val) {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = cleanEnv(val);
    }
  }
}

const token = cleanEnv(process.env.QSTASH_TOKEN);
const baseUrl = cleanEnv(process.env.QSTASH_URL) || undefined;
const client = new QStashClient({ token, baseUrl });

async function testQueuePublish() {
  try {
    console.log('Testing publishJSON with queueName: "email_job_queue"...');
    const res = await client.publishJSON({
      url: 'https://httpbin.org/post',
      queueName: 'email_job_queue',
      delay: 3600, // 1 hour delay
      body: {
        test: true,
        queue: 'email_job_queue',
        timestamp: Date.now()
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Publish result with queueName:', res);

    console.log('\nChecking queue in QStash...');
    try {
      if (client.queue) {
        const q = client.queue({ queueName: 'email_job_queue' });
        console.log('Queue instance exists:', Boolean(q));
      }
    } catch (qe) {
      console.log('Queue check error:', qe.message);
    }
  } catch (err) {
    console.error('Error publishing to email_job_queue:', err);
  }
}

testQueuePublish();
