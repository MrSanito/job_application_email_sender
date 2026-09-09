import fs from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

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

async function testGeneration(name, apiKey, modelName = 'gemini-2.5-flash') {
  console.log(`\nTesting ${name} with model "${modelName}":`);
  try {
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      maxOutputTokens: 50,
      temperature: 0.2,
    });

    const res = await llm.invoke([
      new HumanMessage('Generate a 1-sentence friendly greeting for a job outreach email.')
    ]);

    console.log(`  ✅ SUCCESS: "${String(res.content).trim()}"`);
    return true;
  } catch (err) {
    console.log(`  ❌ LangChain failed: ${err.message}`);
    // Try direct REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Generate a 1-sentence friendly greeting.' }] }]
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`  ✅ Direct REST SUCCESS: "${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`);
        return true;
      } else {
        console.log(`  ❌ Direct REST error:`, JSON.stringify(data));
      }
    } catch (e) {
      console.log(`  ❌ Direct REST exception:`, e.message);
    }
    return false;
  }
}

async function run() {
  await testGeneration('Key 1 (GOOGLE_API_KEY)', env.GOOGLE_API_KEY, 'gemini-2.5-flash');
  await testGeneration('Key 2 (GOOGLE_API_KEY2)', env.GOOGLE_API_KEY2, 'gemini-2.5-flash');
}

run();
