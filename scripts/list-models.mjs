import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
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
    env[key] = val;
  }
}

async function listModels(name, apiKey) {
  console.log(`\nListing models for ${name}:`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log(`  Found ${data.models.length} models:`);
      const generateModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name);
      console.log('  Models supporting generateContent:', generateModels);
    } else {
      console.log('  Response:', JSON.stringify(data));
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }
}

async function run() {
  await listModels('Key 1', env.GOOGLE_API_KEY);
  await listModels('Key 2', env.GOOGLE_API_KEY2);
}

run();
