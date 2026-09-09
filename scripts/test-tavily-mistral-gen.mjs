import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'open-mistral-7b',
  temperature: 0.7,
});

async function testCompanyEnrichment() {
  const company = 'Linear';
  console.log(`1. Searching Tavily for company intelligence on "${company}"...`);
  const searchRes = await tvly.search(`${company} software product engineering`, { maxResults: 2 });
  const companyContext = searchRes.results?.map(r => r.content).join('\n\n') || 'Issue tracking tool for high performance engineering teams.';
  console.log('Company Context retrieved (first 200 chars):', companyContext.slice(0, 200));

  console.log('\n2. Generating email with Mistral AI using Tavily context...');
  const systemPrompt = `You are a cold outreach email expert writing a short, authentic cold email from a developer reaching out regarding open full-stack or Gen AI roles.
Candidate: Vishal, Full-Stack Developer (MERN + Gen AI).
Core accomplishments:
- Built production AI voice agent handling ~1,000 calls/day across clients (sales and HR hiring pipelines) on Pipecat with real-time STT/TTS and Node/BullMQ/Redis queue backend.
- Built real-time multiplayer platform with DPoP auth and device session management.
End strictly with:
GitHub: github.com/MrSanito

Best,
Vishal

Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}.`;

  const userPrompt = `Target Company: Linear
Company Web Intelligence:
${companyContext}

Write a natural, crisp outreach email inquiring about full-stack or Gen AI openings at Linear. Reference their focus based on the context.`;

  const res = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  console.log('\n3. Mistral Response:');
  console.log(res.content);
}

testCompanyEnrichment();
