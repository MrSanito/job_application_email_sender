import fs from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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

const allKeys = [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2].filter(Boolean);
const models = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

async function generateSample(index) {
  const selectedKey = allKeys[Math.floor(Math.random() * allKeys.length)];
  const selectedModel = models[Math.floor(Math.random() * models.length)];
  const keyNumber = allKeys.indexOf(selectedKey) + 1;

  console.log(`\n[Run #${index}] Testing Model: "${selectedModel}" with Key #${keyNumber}...`);

  const llm = new ChatGoogleGenerativeAI({
    model: selectedModel,
    apiKey: selectedKey,
    temperature: 0.7,
  });

  const res = await llm.invoke([
    new SystemMessage('You are writing a short personalized cold email for Vishal Nishad (Full-Stack Dev, https://zynito.in). Output JSON: {"subject": "...", "textBody": "..."}'),
    new HumanMessage('Company: Novumlogic Technologies, Role: Full Stack Developer')
  ]);

  let raw = String(res.content).trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim();
  }
  const parsed = JSON.parse(raw);
  console.log(`✅ SUCCESS [${selectedModel} - Key #${keyNumber}]:`);
  console.log(`   Subject: ${parsed.subject}`);
  console.log(`   Body: ${parsed.textBody?.slice(0, 100)}...`);
}

async function run() {
  for (let i = 1; i <= 3; i++) {
    await generateSample(i);
  }
}

run();
