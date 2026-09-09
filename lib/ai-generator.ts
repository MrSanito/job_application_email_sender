import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { tavily } from '@tavily/core';
import { Lead } from '@/types';
import {
  renderTemplate,
  getRandomFallbackTemplate,
} from './template-engine';

export interface DynamicEmailGenerationResult {
  subject: string;
  htmlBody: string;
  textBody: string;
  isAiGenerated: boolean;
  modelUsed?: string;
  keyUsed?: string;
  companyContext?: string;
  tavilyQuery?: string;
  latencyMs: number;
}

export interface CandidateProfile {
  name?: string;
  role?: string;
  skills?: string;
  portfolioUrl?: string;
  experienceSummary?: string;
}

/**
 * Cache for Tavily company research to avoid repeated queries and respect rate limits
 */
const companyResearchCache = new Map<string, { context: string; timestamp: number }>();

/**
 * Perform live internet search with Tavily to gather intelligence & context about target company
 */
export async function searchCompanyContextWithTavily(
  companyName: string,
  website?: string,
  category?: string
): Promise<{ query: string; context: string; sources: string[] }> {
  const apiKey = (process.env.TAVILY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const defaultFallback = `${companyName} operates in ${category || 'the software and technology'} space.`;

  if (!apiKey || !companyName || companyName.toLowerCase() === 'your company' || companyName.toLowerCase() === 'n/a') {
    return { query: '', context: defaultFallback, sources: [] };
  }

  const cacheKey = `${companyName.toLowerCase().trim()}_${(category || '').toLowerCase().trim()}`;
  const cached = companyResearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) {
    return { query: `[cached] ${companyName}`, context: cached.context, sources: [] };
  }

  try {
    const tvly = tavily({ apiKey });
    const query = `${companyName} ${website || ''} ${category || ''} software product overview engineering`.trim();
    const searchRes = await tvly.search(query, {
      maxResults: 2,
    });

    const snippets = searchRes.results?.map((r) => r.content).filter(Boolean) || [];
    const sources = searchRes.results?.map((r) => r.url).filter(Boolean) || [];
    const context = snippets.join('\n\n').slice(0, 1000) || defaultFallback;

    companyResearchCache.set(cacheKey, { context, timestamp: Date.now() });
    return { query, context, sources };
  } catch (err) {
    console.warn(`[Tavily Search Warning] Could not search context for "${companyName}":`, err instanceof Error ? err.message : err);
    return { query: companyName, context: defaultFallback, sources: [] };
  }
}

/**
 * Parse and categorize Mistral AI API errors
 */
export function parseApiError(err: unknown): {
  code: number | string;
  type: string;
  message: string;
  isRetryable: boolean;
} {
  const message = err instanceof Error ? err.message : String(err);
  const msgLower = message.toLowerCase();

  let code: number | string = 'UNKNOWN';
  let type = 'General Error';
  let isRetryable = true;

  if (message.includes('429') || msgLower.includes('rate limit') || msgLower.includes('rate_limited') || msgLower.includes('too many requests')) {
    code = 429;
    type = 'Rate Limit Exceeded';
    isRetryable = true;
  } else if (message.includes('401') || message.includes('403') || msgLower.includes('unauthorized') || msgLower.includes('forbidden') || msgLower.includes('invalid_api_key')) {
    code = 403;
    type = 'Authentication / Key Error';
    isRetryable = false;
  } else if (message.includes('503') || msgLower.includes('unavailable') || msgLower.includes('overloaded')) {
    code = 503;
    type = 'Service Unavailable';
    isRetryable = true;
  } else if (message.includes('500') || msgLower.includes('internal error')) {
    code = 500;
    type = 'Internal Server Error';
    isRetryable = true;
  } else if (message.includes('400') || msgLower.includes('invalid_argument') || msgLower.includes('bad request')) {
    code = 400;
    type = 'Bad Request';
    isRetryable = false;
  }

  return { code, type, message, isRetryable };
}

/**
 * Verified active Mistral AI models for rotation and load balancing
 */
export const MISTRAL_ROTATION_MODELS: string[] = [
  'open-mistral-7b',
  'open-mistral-nemo',
  'ministral-8b-latest',
  'mistral-tiny',
  'ministral-3b-latest',
  'codestral-latest',
];

/**
 * Collect all configured Mistral API keys from environment
 */
export function getAllMistralApiKeys(): string[] {
  const candidates: string[] = [];

  const commaLists = [
    process.env.MISTRAL_API_KEYS,
    process.env.MISTRAL_API_KEY_LIST,
  ];
  for (const list of commaLists) {
    if (list && typeof list === 'string') {
      const parts = list.split(/[,;\n]/).map((k) => k.trim());
      candidates.push(...parts);
    }
  }

  for (let i = 1; i <= 10; i++) {
    candidates.push(
      process.env[`MISTRAL_API_KEY${i}`] || '',
      process.env[`MISTRAL_API_KEY_${i}`] || ''
    );
  }

  candidates.push(
    process.env.MISTRAL_API_KEY || '',
    process.env.NEXT_PUBLIC_MISTRAL_API_KEY || ''
  );

  const clean = candidates
    .map((k) => (typeof k === 'string' ? k.trim().replace(/^["']|["']$/g, '') : ''))
    .filter((k) => k.length > 8);

  return Array.from(new Set(clean));
}

/**
 * Pick a random Mistral API key from the pool
 */
export function getRandomMistralApiKey(customApiKey?: string): {
  key: string;
  keyIndex: number;
  totalKeys: number;
} | null {
  if (customApiKey) {
    return { key: customApiKey, keyIndex: 1, totalKeys: 1 };
  }

  const keys = getAllMistralApiKeys();
  if (keys.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * keys.length);
  return {
    key: keys[randomIndex],
    keyIndex: randomIndex + 1,
    totalKeys: keys.length,
  };
}

/**
 * Initialize ChatMistralAI instance
 */
export function getMistralModel(
  apiKey: string,
  modelName: string = 'open-mistral-7b',
  temperature: number = 0.7
): ChatMistralAI | null {
  if (!apiKey) return null;

  try {
    return new ChatMistralAI({
      model: modelName,
      apiKey,
      temperature,
      maxRetries: 2,
    });
  } catch (error) {
    console.error(`Error initializing ChatMistralAI (${modelName}):`, error);
    return null;
  }
}

/**
 * 5 Anti-Spam Structural Archetypes that rotate per email to eliminate syntactic fingerprinting
 */
export interface AntiSpamStructureArchetype {
  id: string;
  name: string;
  structuralPattern: string;
  openingStyle: string;
  bodyStyle: string;
  ctaStyle: string;
  subjectGuidance: string;
}

export const ANTI_SPAM_ARCHETYPES: AntiSpamStructureArchetype[] = [
  {
    id: 'production-voice-systems',
    name: 'Production Voice Systems & Full-Stack Angle',
    structuralPattern: 'Direct intro -> MERN + AI voice systems handling ~1,000 calls/day on Pipecat + BullMQ/Redis -> Real-time multiplayer platform with DPoP auth -> Inquire about [Company] openings -> GitHub link & signoff.',
    openingStyle: 'Natural greeting by first name (or "Hi there," / "Hello," if no individual name). Direct opener introducing role.',
    bodyStyle: 'Highlight production AI voice agent handling ~1,000 calls/day across clients (sales and HR hiring pipelines) on Pipecat with real-time STT/TTS and Node/BullMQ/Redis queue backend, plus real-time multiplayer platform with DPoP auth.',
    ctaStyle: 'Ask if there are any full-stack or Gen AI engineering openings on their team right now.',
    subjectGuidance: 'e.g. "Full-Stack Developer (MERN + Gen AI) — open to opportunities" or "Full-Stack Developer (MERN + Gen AI) — [Company]"',
  },
  {
    id: 'ultra-concise-builder',
    name: 'Ultra-Concise 3-Sentence Note',
    structuralPattern: 'Tight 3-sentence note: Direct introduction -> Core production achievements (~1,000 calls/day voice agent & DPoP multiplayer auth) -> Check for Gen AI / full-stack openings at [Company] + GitHub.',
    openingStyle: 'Cut straight to the point without introductory throat-clearing.',
    bodyStyle: 'State background crisply: full-stack developer (MERN + AI voice systems) who built ~1k calls/day Pipecat voice pipelines and secure multiplayer systems.',
    ctaStyle: 'Check if there are any open full-stack or Gen AI roles at [Company].',
    subjectGuidance: 'e.g. "Full-Stack Developer (MERN + Gen AI) — open to opportunities" or "Full-stack / Gen AI openings at [Company]?"',
  },
  {
    id: 'systems-architecture',
    name: 'Systems & Real-Time Infrastructure Angle',
    structuralPattern: 'Systems & velocity framing: Full-stack + Gen AI / voice engineer -> Scaling audio pipelines with Pipecat, BullMQ, Redis, and DPoP session auth -> Reaching out regarding [Company] opportunities.',
    openingStyle: 'Friendly, peer-to-peer technical greeting.',
    bodyStyle: 'Focus on shipping end-to-end: real-time voice agent infrastructure (Pipecat, STT/TTS, BullMQ/Redis) and resilient MERN backend architectures.',
    ctaStyle: 'Inquire if their engineering team is currently looking for full-stack or Gen AI talent.',
    subjectGuidance: 'e.g. "Full-Stack Developer (MERN + Gen AI) — [Company]" or "[Company] + Vishal (Full-Stack / Gen AI)"',
  },
  {
    id: 'conversational-inquiry',
    name: 'Conversational Team Outreach Angle',
    structuralPattern: 'Conversational outreach: Reaching out regarding [Company]\'s product/space -> Snapshot of hands-on MERN, ~1k calls/day Pipecat voice agent, and DPoP auth -> GitHub link -> Low-friction signoff.',
    openingStyle: 'Natural note referencing their work in their space/product.',
    bodyStyle: 'Explain background building production AI voice systems (sales & HR pipelines) and full-stack platforms.',
    ctaStyle: 'Low-pressure check if they have open developer seats in full-stack or Gen AI.',
    subjectGuidance: 'e.g. "Exploring Full-Stack / Gen AI Roles at [Company]" or "Full-Stack Developer (MERN + Gen AI) — open to opportunities"',
  },
  {
    id: 'execution-impact',
    name: 'Execution & High-Impact Delivery Angle',
    structuralPattern: 'Punchy 2-paragraph flow: Brief intro -> Key production highlights (Pipecat voice agent at 1,000 calls/day, Node/BullMQ/Redis queue, DPoP auth multiplayer) -> Question on team openings -> GitHub signoff.',
    openingStyle: 'Natural, brief greeting referencing their engineering team.',
    bodyStyle: 'Crisp sentences showing immediate technical depth across MERN, real-time STT/TTS pipelines, and async backend queues.',
    ctaStyle: 'Ask if their team has upcoming full-stack or Gen AI engineering openings.',
    subjectGuidance: 'e.g. "[Company] engineering / Vishal (Full-Stack & Gen AI)" or "Full-Stack Developer (MERN + Gen AI) — open to opportunities"',
  },
];

/**
 * Dynamically generate on-the-spot personalized cold email HTML and subject using Mistral AI + Tavily Web Intelligence
 */
export async function generateOnTheSpotEmail(
  lead: Lead,
  customInstructions?: string,
  candidateProfile?: CandidateProfile,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<DynamicEmailGenerationResult> {
  const startTime = Date.now();

  const contactName = lead.name?.trim();
  const companyName = lead.company?.trim() || lead.name?.trim() || 'your company';
  const hasSpecificContactName =
    contactName &&
    contactName.toLowerCase() !== 'n/a' &&
    contactName.toLowerCase() !== 'hiring manager' &&
    contactName.toLowerCase() !== 'recruiter' &&
    (!lead.company || contactName.toLowerCase() !== lead.company.trim().toLowerCase());

  // 1. GATHER COMPANY CONTEXT VIA TAVILY WEB SEARCH
  const tavilyResult = await searchCompanyContextWithTavily(
    companyName,
    lead.website,
    lead.catName
  );

  // Pick a random anti-spam structural archetype per email
  const archetype = ANTI_SPAM_ARCHETYPES[Math.floor(Math.random() * ANTI_SPAM_ARCHETYPES.length)];

  // Randomized temperature between 0.65 and 0.85 for natural human cadence
  const dynamicTemperature = Number((0.65 + Math.random() * 0.2).toFixed(2));

  // Salutation variation pool
  const salutationsWithPerson = ['Hi', 'Hey', 'Hello'];
  const randomSalutation = salutationsWithPerson[Math.floor(Math.random() * salutationsWithPerson.length)];
  const salutationRule = hasSpecificContactName
    ? `Greet the contact naturally by first name: "${randomSalutation} ${contactName.split(' ')[0]},"`
    : `No individual contact/HR name is provided. Greet naturally as "Hi there," or "Hello," (STRICT RULE: Do NOT write "team", NEVER use "Hi ${companyName} team," or "Hi team," or "Dear team").`;

  const systemPrompt = `You are a cold outreach email expert writing a short, authentic, personalized cold email from a developer reaching out directly regarding open full-stack or Gen AI engineering roles.

ANTI-SPAM & ANTI-FINGERPRINTING DIRECTIVES (CRITICAL):
- Avoid formulaic spam patterns, robotic templates, or generic fluff.
- DO NOT use generic spam openers like: "I hope this email finds you well", "I came across your company", "I was impressed by", "I am writing to express my eager interest", "cutting-edge", "game-changer", "world-class".
- Adopt this specific structural angle for this email: [${archetype.name}]
- Structural guidance: ${archetype.structuralPattern}
- Opening guidance: ${archetype.openingStyle}
- Body guidance: ${archetype.bodyStyle}
- CTA guidance: ${archetype.ctaStyle}
- Subject Line style: ${archetype.subjectGuidance}

Candidate Profile & Technical Proof Points:
- Name: Vishal
- Role: Full-stack developer (MERN + AI voice systems)
- Core Accomplishment 1: Built a production AI voice agent handling ~1,000 calls/day across multiple clients — sales and HR hiring pipelines — on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
- Core Accomplishment 2: Built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).
- Goal: Inquire if there are any full-stack or Gen AI engineering openings on their team right now.

Strict Content & Formatting Rules:
1. Salutation: ${salutationRule}
2. Accurately highlight:
   - "I'm Vishal, a full-stack developer (MERN + AI voice systems)."
   - Production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
   - Real-time multiplayer platform with full auth system (DPoP, rotating refresh tokens, device-level session management).
   - Natural bridge connecting candidate background to ${companyName}'s product focus based on the web intelligence provided below.
3. Length: 60–95 words (crisp, authentic, easy to read on mobile).
4. Links: Include "GitHub: github.com/MrSanito". Do NOT invent other URLs.
5. Sign-off: End strictly with:
GitHub: github.com/MrSanito

Best,
Vishal
6. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

  const userPrompt = `Write a fresh, authentic job inquiry email tailored for:
Target Recipient & Company:
- Recipient Name: ${hasSpecificContactName ? contactName : `[No HR Name - Greet as "Hi there," or "Hello,"]`}
- Company: ${companyName}
- Space / Category: ${lead.catName || 'Software & Technology'}
- Website: ${lead.website || 'N/A'}
- City / Location: ${lead.address || 'Remote'}
- Candidate Notes: ${customInstructions || 'Inquiring about full-stack or Gen AI openings.'}

Company Live Web Intelligence (gathered from Tavily search):
"""
${tavilyResult.context}
"""

Candidate Profile:
- Name: Vishal
- Role: Full-Stack Developer (MERN + Gen AI)
- Proof Points: ~1k calls/day Pipecat AI voice agent (STT/TTS, BullMQ/Redis) + Real-time multiplayer platform with DPoP auth.
- Ask: Check if there are any full-stack or Gen AI engineering openings at ${companyName}.
- GitHub: github.com/MrSanito
- Sign-off: Best, Vishal`;

  // Helper for URL sanitization
  const sanitizeUrlReferences = (str: string) => {
    if (!str) return '';
    return str
      .replace(/https?:\/\/voice\.solobuildai\.com[^\s<>"']*/gi, '')
      .replace(/voice\.solobuildai\.com/gi, '')
      .replace(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s<>"']*/gi, '');
  };

  // 2. TRY MISTRAL AI MODELS (ONLY ENGINE)
  const mistralKeys = getAllMistralApiKeys();
  const keysToTry = apiKeyOverride ? [apiKeyOverride] : mistralKeys;
  const modelsToTry = modelOverride ? [modelOverride] : MISTRAL_ROTATION_MODELS;

  if (keysToTry.length > 0) {
    for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
      const currentKey = keysToTry[kIdx];
      for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
        const currentModelName = modelsToTry[mIdx];
        const model = getMistralModel(currentKey, currentModelName, dynamicTemperature);
        if (!model) continue;

        try {
          const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
          ]);

          let rawText = String(response.content || '').trim();
          if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim();
          }

          const parsed = JSON.parse(rawText);
          const cleanedSubject = sanitizeUrlReferences(parsed.subject || `Full-Stack Developer (MERN + Gen AI) — ${companyName}`);
          const cleanedHtml = sanitizeUrlReferences(parsed.htmlBody || `<p>${parsed.textBody?.replace(/\n/g, '<br/>')}</p>`);
          const cleanedText = sanitizeUrlReferences(parsed.textBody || parsed.htmlBody?.replace(/<[^>]*>?/gm, ''));

          return {
            subject: cleanedSubject,
            htmlBody: cleanedHtml,
            textBody: cleanedText,
            isAiGenerated: true,
            modelUsed: `Mistral AI (${currentModelName}) + Tavily Search [${archetype.name}]`,
            keyUsed: `Mistral Key #${kIdx + 1} of ${keysToTry.length}`,
            companyContext: tavilyResult.context,
            tavilyQuery: tavilyResult.query,
            latencyMs: Date.now() - startTime,
          };
        } catch (mErr: unknown) {
          const errInfo = parseApiError(mErr);
          console.warn(
            `[Mistral Error ${errInfo.code}] on model "${currentModelName}". Rotating to next model:`,
            errInfo.message.slice(0, 100)
          );
          if (errInfo.code === 429) {
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        }
      }
    }
  }

  // 3. FINAL SAFETY FALLBACK TO TEMPLATE ENGINE (ONLY IF MISTRAL OFFLINE)
  const fallbackTpl = getRandomFallbackTemplate();
  const renderedSubject = renderTemplate(fallbackTpl.subject, lead);
  const renderedBody = renderTemplate(fallbackTpl.body, lead);

  return {
    subject: renderedSubject,
    htmlBody: renderedBody.replace(/\n/g, '<br/>'),
    textBody: renderedBody,
    isAiGenerated: false,
    modelUsed: 'Template Engine Fallback',
    companyContext: tavilyResult.context,
    tavilyQuery: tavilyResult.query,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Test Mistral AI and Tavily Search connections
 */
export async function testMistralConnection(): Promise<{
  success: boolean;
  mistralActive: boolean;
  tavilyActive: boolean;
  workingModels: string[];
  totalKeys: number;
  message: string;
  sampleResponse?: string;
  tavilySnippet?: string;
}> {
  const mistralKeys = getAllMistralApiKeys();
  const tavilyKey = (process.env.TAVILY_API_KEY || '').trim();

  let tavilyActive = false;
  let tavilySnippet = '';
  if (tavilyKey) {
    try {
      const tvly = tavily({ apiKey: tavilyKey });
      const tRes = await tvly.search('OpenAI software technology', { maxResults: 1 });
      if (tRes.results && tRes.results.length > 0) {
        tavilyActive = true;
        tavilySnippet = tRes.results[0].content?.slice(0, 140) || 'Active';
      }
    } catch (tErr) {
      console.warn('Tavily connection test error:', tErr);
    }
  }

  let mistralActive = false;
  const workingModels: string[] = [];
  let sampleResponse = '';

  if (mistralKeys.length > 0) {
    const keyToTest = mistralKeys[0];
    for (const mName of MISTRAL_ROTATION_MODELS) {
      try {
        const model = getMistralModel(keyToTest, mName, 0.5);
        if (!model) continue;
        const res = await model.invoke('Say "Mistral AI online" in 3 words.');
        mistralActive = true;
        workingModels.push(mName);
        if (!sampleResponse) sampleResponse = String(res.content).trim();
      } catch (mErr) {
        console.warn(`Mistral test model ${mName} skipped:`, mErr instanceof Error ? mErr.message.slice(0, 80) : mErr);
      }
    }
  }

  const isSuccess = mistralActive || tavilyActive;
  const message = isSuccess
    ? `Mistral AI (${workingModels.length} models ready) & Tavily Search (${tavilyActive ? 'Connected' : 'Offline'}) ready for company-enriched email generation!`
    : 'Failed to connect to Mistral AI or Tavily Search. Please verify MISTRAL_API_KEY and TAVILY_API_KEY.';

  return {
    success: isSuccess,
    mistralActive,
    tavilyActive,
    workingModels,
    totalKeys: mistralKeys.length,
    message,
    sampleResponse,
    tavilySnippet,
  };
}
