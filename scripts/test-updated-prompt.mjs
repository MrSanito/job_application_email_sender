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

const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY2 || process.env.GEMINI_API_KEY;

const lead = {
  company: 'Arth Technology',
  name: '',
  website: 'https://arthtechnology.com',
  catName: 'Software & Web Development Solutions'
};

const hasSpecificContactName = Boolean(lead.name && lead.name.trim() && lead.name.toLowerCase() !== 'n/a');
const contactName = lead.name || '';
const companyName = lead.company;
const salutationsWithPerson = ['Hi', 'Hey', 'Hello'];
const randomSalutation = salutationsWithPerson[Math.floor(Math.random() * salutationsWithPerson.length)];
const salutationRule = hasSpecificContactName
  ? `Greet the contact naturally by first name: "${randomSalutation} ${contactName.split(' ')[0]},"`
  : `No individual contact/HR name is provided. Greet naturally as "Hi there," or "Hello," (STRICT RULE: Do NOT write "team", NEVER use "Hi ${companyName} team," or "Hi team," or "Dear team").`;

const systemPrompt = `You are a cold outreach email expert writing a short, authentic, personalized cold email from a developer reaching out directly regarding open full-stack or AI/voice engineering roles.

ANTI-SPAM & ANTI-FINGERPRINTING DIRECTIVES (CRITICAL):
- Avoid formulaic spam patterns, robotic templates, or generic fluff.
- DO NOT use generic spam openers like: "I hope this email finds you well", "I came across your company", "I was impressed by", "I am writing to express my eager interest", "cutting-edge", "game-changer", "world-class".

Candidate Profile & Technical Proof Points:
- Name: Vishal
- Role: Full-stack developer (MERN + AI voice systems)
- Core Accomplishment 1: Built a production AI voice agent handling ~1,000 calls/day across multiple clients — sales and HR hiring pipelines — on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
- Core Accomplishment 2: Built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).
- Company Context: Reaching out to ${companyName} (${lead.catName || 'software / tech space'}).
- Goal: Check if they have any full-stack or AI/voice engineering openings on their team right now.

Strict Content & Formatting Rules:
1. Salutation: ${salutationRule}
2. Accurately highlight:
   - "I'm Vishal, a full-stack developer (MERN + AI voice systems)."
   - Production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
   - Real-time multiplayer platform with full auth system (DPoP, rotating refresh tokens, device-level session management).
   - "Looking at ${companyName}'s work in ${lead.catName || 'tech'} and wanted to check — any full-stack or AI/voice engineering openings on your team right now?"
3. Length: 60–95 words (crisp, authentic, easy to read on mobile).
4. Links: Include "GitHub: github.com/MrSanito". Do NOT invent other URLs (no voice.solobuildai.com, no LinkedIn).
5. Sign-off: End strictly with:
GitHub: github.com/MrSanito

Best,
Vishal
6. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

const userPrompt = `Write a fresh, authentic job inquiry email tailored for:
Target Recipient & Company:
- Recipient Name: ${hasSpecificContactName ? contactName : `[No HR Name - Greet as "Hi there," or "Hello,"]`}
- Company: ${companyName}
- Space / Product / Focus: ${lead.catName || 'Software & Tech'}
- Website / Domain: ${lead.website || 'N/A'}
- City / Location: ${lead.address || 'Remote'}

Candidate Profile:
- Name: Vishal
- Role: Full-Stack Developer (MERN + AI voice systems)
- Voice Agent Experience: Built production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
- Auth & Real-Time Experience: Built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).
- Ask: Looking at ${companyName}'s work and checking if there are any full-stack or AI/voice engineering openings on their team right now.
- GitHub: github.com/MrSanito
- Sign-off: Best, Vishal`;

async function run() {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: key,
    temperature: 0.8,
  });

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  console.log('AI GENERATED RESULT:\n', response.content);
}

run().catch(console.error);
