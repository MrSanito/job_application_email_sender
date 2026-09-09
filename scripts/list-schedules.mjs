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

async function main() {
  console.log('=== UPSTASH QSTASH QUERY RESULT ===\n');

  // 1. client.schedules.list()
  console.log('1. client.schedules.list():');
  const schedules = await client.schedules.list();
  console.log(schedules);
  console.log(`Total recurring schedules: ${schedules.length}\n`);

  // 2. Dead Letter Queue
  console.log('2. client.dlq.listMessages():');
  try {
    const dlq = await client.dlq.listMessages();
    console.log(dlq);
  } catch (err) {
    console.log('DLQ query error:', err.message);
  }

  // 3. Recent Events / Messages
  console.log('\n3. client.events() summary:');
  try {
    const events = await client.events();
    const list = events.events || [];
    console.log(`Total recent event logs: ${list.length}`);
    const active = list.filter(e => e.state === 'ACTIVE');
    const delivered = list.filter(e => e.state === 'DELIVERED');
    const failed = list.filter(e => e.state === 'FAILED' || e.state === 'RETRY');
    console.log(`- Active / In-Flight: ${active.length}`);
    console.log(`- Delivered: ${delivered.length}`);
    console.log(`- Failed / Retrying: ${failed.length}`);
    if (active.length > 0) {
      console.log('\nActive In-Flight Message IDs:');
      console.log(active.map(m => ({ id: m.messageId, url: m.url, time: new Date(m.time).toISOString() })));
    }
  } catch (err) {
    console.log('Events query error:', err.message);
  }
}

main().catch(console.error);
