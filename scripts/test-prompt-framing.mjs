import fs from 'fs';
import path from 'path';
import { generateOnTheSpotEmail } from '../lib/ai-generator.js';

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

async function run() {
  const sampleLead = {
    id: 'lead-test',
    name: 'David',
    company: 'Linear',
    catName: 'Issue Tracking & Real-Time Sync Engines',
    website: 'linear.app',
    status: 'valid',
  };

  console.log('Testing generateOnTheSpotEmail with new job-application framing...\n');
  const result = await generateOnTheSpotEmail(sampleLead);
  console.log('Subject:', result.subject);
  console.log('Model Used:', result.modelUsed);
  console.log('\nRendered Plain Text:');
  console.log('----------------------------------------------------');
  console.log(result.textBody);
  console.log('----------------------------------------------------');
  const words = result.textBody.trim().split(/\s+/).length;
  console.log(`Word Count: ${words} words (Target: 90-130 words)`);
}

run().catch(console.error);
