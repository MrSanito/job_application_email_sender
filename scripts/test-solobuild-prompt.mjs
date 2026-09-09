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

const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY2;

const lead = {
  company: 'Arth Technology',
  name: '',
  website: 'https://arthtechnology.com',
  catName: 'Software & Web Development Solutions'
};

const profile = {
  name: 'Vishal Nishad',
  role: 'Full-Stack Developer',
  skills: 'Next.js, React, Node.js, TypeScript, PostgreSQL, MongoDB, Redis, BullMQ, AI Voice & Calling Agents (Pipecat, Gemini, Plivo, STT/TTS)',
  portfolioUrl: 'https://zynito.in',
  experienceSummary: 'Founding Developer at SoloBuild AI building full-stack web applications, async queue pipelines, and AI voice/calling agent systems (Pipecat, Gemini, Plivo, STT/TTS) end-to-end.'
};

const systemPrompt = `You are writing a short, honest, personalized job outreach email — a candidate reaching out directly to a company expressing interest in open full-stack / backend developer roles (NOT a freelance/consulting pitch, NOT a sales email).

Context:
- Company: ${lead.company}
- Contact: Software Engineering
- Website: ${lead.website}
- Industry/focus: ${lead.catName}

Rules:
1. Salutation: "Hi there," or "Hello," (STRICT RULE: Do NOT write "team", NEVER use "Hi ${lead.company} team," or "Hi team," or "Dear team").
2. Open with ONE specific, genuine line about the company's product or tech — no generic flattery like "impressive work."
3. Position the candidate honestly: a hands-on full-stack developer who founded SoloBuild AI, building full-stack web applications and AI voice/calling agent pipelines (${profile.skills}). Keep it short, simple, and grounded.
4. Give 1-2 concrete ways the candidate could contribute (e.g. shipping full-stack features, building robust backend APIs/queues, or AI voice/calling agent integrations) — no buzzword soup.
5. Tone: conversational, confident, humble. Never use: "I hope this email finds you well," "I am writing to express my interest," "extensive experience," "world-class," "if you ever need extra hands."
6. Avoid writing or repeating "team" in greetings (do NOT use "Hi team" or "Hi [Company] team").
7. Length: 70–95 words (keep it short and simple).
8. Close by asking about open engineering roles or a quick chat. Mention that resume is attached.
9. Signature: Add ONLY the candidate's portfolio URL (${profile.portfolioUrl}). Do NOT include any other URLs (no voice.solobuildai.com, no GitHub, no LinkedIn in the email body text — all links and full project details are in the attached resume).
10. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

const userPrompt = `Write a short and simple job application email for:
Target Recipient & Company:
- Recipient Name: [No HR Name - Greet naturally as "Hi there," or "Hello,"]
- Company: ${lead.company}
- Industry / Focus: ${lead.catName}
- Website / Domain: ${lead.website}
- City / Location: Remote

Candidate Profile:
- Name: ${profile.name}
- Current Role: ${profile.role}
- Core Skills: ${profile.skills}
- Portfolio: ${profile.portfolioUrl} (include ONLY this link in signature, do NOT add any other URLs in email text)
- Background: Founding Developer at SoloBuild AI — built and shipped full-stack web applications, async Redis/BullMQ pipelines, and AI voice/calling agent systems (Pipecat, Gemini, Plivo, STT/TTS) end-to-end.`;

async function run() {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: key,
    temperature: 0.6,
  });

  const res = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  let raw = String(res.content).trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim();
  }

  const parsed = JSON.parse(raw);
  console.log('=== GENERATED SHORT & SIMPLE SOLOBUILD EMAIL ===');
  console.log('Subject:', parsed.subject);
  console.log('\nText Body:\n', parsed.textBody);
}

run();
