import fs from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

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

const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY2;

const candidateModels = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

console.log('Testing Google Gemini Models against active API Key...\n');

async function testAll() {
  for (const modelName of candidateModels) {
    const start = Date.now();
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: key,
        temperature: 0.2,
        maxRetries: 0,
      });

      const res = await llm.invoke([new HumanMessage('Say "OK" in one word.')]);
      const latency = Date.now() - start;
      const text = String(res.content || '').trim();
      console.log(`✅ [WORKING] ${modelName.padEnd(26)} -> Response: "${text}" (${latency}ms)`);
    } catch (err) {
      const latency = Date.now() - start;
      console.log(`❌ [FAILED]  ${modelName.padEnd(26)} -> Error: ${err.message?.slice(0, 70)} (${latency}ms)`);
    }
  }
}

testAll();
