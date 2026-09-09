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

const key = env.GOOGLE_API_KEY;
const candidateModels = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
];

async function test() {
  console.log('Testing candidates with Key 1:');
  for (const m of candidateModels) {
    try {
      const llm = new ChatGoogleGenerativeAI({
        apiKey: key,
        model: m,
        maxOutputTokens: 20,
      });
      const res = await llm.invoke([new HumanMessage('Say hello')]);
      console.log(`  ✅ [${m}] WORKS -> "${String(res.content).trim()}"`);
    } catch (err) {
      console.log(`  ❌ [${m}] ERROR -> ${err.message}`);
    }
  }
}

test();
