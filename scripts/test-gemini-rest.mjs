import fs from 'fs';
import path from 'path';

// Load .env.local
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

async function testGeminiRest(name, apiKey) {
  console.log(`\nTesting ${name}:`);
  if (!apiKey) {
    console.log('  Not set');
    return;
  }
  
  // Test direct REST endpoint to Google Generative Language API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Respond with exactly: "Key working properly!"' }]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.log(`  ❌ REST API Error (${response.status}):`, JSON.stringify(data));
    } else {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
      console.log(`  ✅ REST API Success:`, text.trim());
    }
  } catch (err) {
    console.log(`  ❌ Network / Fetch Error:`, err.message);
  }
}

async function run() {
  await testGeminiRest('Key 1 (GOOGLE_API_KEY)', env.GOOGLE_API_KEY);
  await testGeminiRest('Key 2 (GOOGLE_API_KEY2)', env.GOOGLE_API_KEY2);
}

run();
