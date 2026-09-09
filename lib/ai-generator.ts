import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Lead } from '@/types';
import {
  renderTemplate,
  getRandomFallbackTemplate,
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
} from './template-engine';

export interface DynamicEmailGenerationResult {
  subject: string;
  htmlBody: string;
  textBody: string;
  isAiGenerated: boolean;
  modelUsed?: string;
  keyUsed?: string; // e.g. "Key #1 of 2"
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
 * Parse and categorize Gemini / Google GenAI API errors (409 Conflict, 429 Rate Limit, 403 Quota, 503 Overload, etc.)
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

  if (message.includes('429') || msgLower.includes('resource_exhausted') || msgLower.includes('quota exceeded') || msgLower.includes('rate limit') || msgLower.includes('too many requests')) {
    code = 429;
    type = 'Rate Limit / Quota Exhausted';
    isRetryable = true;
  } else if (message.includes('409') || msgLower.includes('conflict') || msgLower.includes('already exists') || msgLower.includes('aborted')) {
    code = 409;
    type = 'Conflict / State Error';
    isRetryable = true;
  } else if (message.includes('403') || msgLower.includes('permission_denied') || msgLower.includes('forbidden') || msgLower.includes('api key not valid') || msgLower.includes('invalid_api_key')) {
    code = 403;
    type = 'Forbidden / Invalid Key / Quota Block';
    isRetryable = true;
  } else if (message.includes('503') || msgLower.includes('unavailable') || msgLower.includes('high demand') || msgLower.includes('overloaded') || msgLower.includes('backend error')) {
    code = 503;
    type = 'Service Unavailable / Overloaded';
    isRetryable = true;
  } else if (message.includes('500') || msgLower.includes('internal error')) {
    code = 500;
    type = 'Internal Server Error';
    isRetryable = true;
  } else if (message.includes('404') || msgLower.includes('not found') || msgLower.includes('unsupported model')) {
    code = 404;
    type = 'Model Not Found';
    isRetryable = true;
  } else if (message.includes('400') || msgLower.includes('invalid_argument') || msgLower.includes('bad request')) {
    code = 400;
    type = 'Bad Request / Invalid Argument';
    isRetryable = true;
  }

  return { code, type, message, isRetryable };
}

/**
 * Collect all configured Google/Gemini API keys from environment (supports unlimited keys & lists)
 */
export function getAllGeminiApiKeys(): string[] {
  const candidates: string[] = [];

  // 1. Comma / newline separated lists
  const commaLists = [
    process.env.GOOGLE_API_KEYS,
    process.env.GEMINI_API_KEYS,
    process.env.GOOGLE_API_KEY_LIST,
    process.env.GEMINI_API_KEY_LIST,
  ];
  for (const list of commaLists) {
    if (list && typeof list === 'string') {
      const parts = list.split(/[,;\n]/).map((k) => k.trim());
      candidates.push(...parts);
    }
  }

  // 2. Numbered keys (1 through 25)
  for (let i = 1; i <= 25; i++) {
    candidates.push(
      process.env[`GOOGLE_API_KEY${i}`] || '',
      process.env[`GOOGLE_API_KEY_${i}`] || '',
      process.env[`GEMINI_API_KEY${i}`] || '',
      process.env[`GEMINI_API_KEY_${i}`] || '',
      process.env[`GOOGLE-API-KEY${i}`] || '',
      process.env[`GOOGLE-API-KEY-${i}`] || ''
    );
  }

  // 3. Base keys
  candidates.push(
    process.env.GOOGLE_API_KEY || '',
    process.env.GEMINI_API_KEY || '',
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  );

  // 4. Dynamic scan for any matching environment variables
  for (const [k, v] of Object.entries(process.env)) {
    const upper = k.toUpperCase();
    if (
      (upper.startsWith('GOOGLE_API_KEY') ||
        upper.startsWith('GEMINI_API_KEY') ||
        upper.startsWith('GOOGLE-API-KEY')) &&
      typeof v === 'string'
    ) {
      if (v.includes(',')) {
        candidates.push(...v.split(',').map((s) => s.trim()));
      } else {
        candidates.push(v);
      }
    }
  }

  const clean = candidates
    .map((k) => (typeof k === 'string' ? k.trim().replace(/^["']|["']$/g, '') : ''))
    .filter((k) => k.length > 10);

  return Array.from(new Set(clean));
}

/**
 * Pick a random Google Gemini API key from the pool to balance utilization
 */
export function getRandomGeminiApiKey(customApiKey?: string): {
  key: string;
  keyIndex: number;
  totalKeys: number;
} | null {
  if (customApiKey) {
    return { key: customApiKey, keyIndex: 1, totalKeys: 1 };
  }

  const keys = getAllGeminiApiKeys();
  if (keys.length === 0) return null;

  // Random number selection to evenly distribute load
  const randomIndex = Math.floor(Math.random() * keys.length);
  return {
    key: keys[randomIndex],
    keyIndex: randomIndex + 1,
    totalKeys: keys.length,
  };
}

/**
 * Verified active Google Gemini models for randomized rotation and load balancing
 */
export const GEMINI_ROTATION_MODELS: string[] = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

/**
 * Pick a random model from the rotation pool
 */
export function getRandomGeminiModel(customModel?: string): {
  model: string;
  modelIndex: number;
  totalModels: number;
} {
  if (customModel && customModel.trim()) {
    return { model: customModel.trim(), modelIndex: 1, totalModels: 1 };
  }
  const randomIndex = Math.floor(Math.random() * GEMINI_ROTATION_MODELS.length);
  return {
    model: GEMINI_ROTATION_MODELS[randomIndex],
    modelIndex: randomIndex + 1,
    totalModels: GEMINI_ROTATION_MODELS.length,
  };
}

export function getGeminiModel(
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  temperature: number = 0.82
): ChatGoogleGenerativeAI | null {
  if (!apiKey) return null;

  try {
    return new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey,
      temperature,
      maxRetries: 2,
    });
  } catch (error) {
    console.error(`Error initializing ChatGoogleGenerativeAI (${modelName}):`, error);
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
 * Dynamically generate on-the-spot personalized cold email HTML and subject using LangChain + Google Gen AI
 * Uses randomized model, key, temperature, and structural anti-spam archetypes!
 */
export async function generateOnTheSpotEmail(
  lead: Lead,
  customInstructions?: string,
  candidateProfile?: CandidateProfile,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<DynamicEmailGenerationResult> {
  const startTime = Date.now();
  const keySelection = getRandomGeminiApiKey(apiKeyOverride);
  const modelSelection = getRandomGeminiModel(modelOverride);

  // Pick a random anti-spam structural archetype per email
  const archetype = ANTI_SPAM_ARCHETYPES[Math.floor(Math.random() * ANTI_SPAM_ARCHETYPES.length)];

  // Randomized temperature between 0.78 and 0.92 for high natural variability
  const dynamicTemperature = Number((0.78 + Math.random() * 0.14).toFixed(2));

  // Default candidate profile matching the user's verified background
  const profile: CandidateProfile = {
    name: candidateProfile?.name || 'Vishal',
    role: candidateProfile?.role || 'Full-Stack Developer (MERN + Gen AI)',
    skills:
      candidateProfile?.skills ||
      'MERN (MongoDB, Express, React, Node.js), TypeScript, AI Voice Systems (Pipecat, real-time STT/TTS), BullMQ, Redis, DPoP auth, session management',
    portfolioUrl: candidateProfile?.portfolioUrl || 'github.com/MrSanito',
    experienceSummary:
      candidateProfile?.experienceSummary ||
      'Built a production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis). Also built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).',
  };

  if (!keySelection) {
    // Graceful fallback to dynamic template interpolation with structural rotation
    const fallbackTpl = getRandomFallbackTemplate();
    const renderedSubject = renderTemplate(fallbackTpl.subject, lead);
    const renderedBody = renderTemplate(fallbackTpl.body, lead);

    return {
      subject: renderedSubject,
      htmlBody: renderedBody.replace(/\n/g, '<br/>'),
      textBody: renderedBody,
      isAiGenerated: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const allKeys = getAllGeminiApiKeys();
  const keysToTry = apiKeyOverride
    ? [apiKeyOverride]
    : [keySelection.key, ...allKeys.filter((k) => k !== keySelection.key)];

  const modelsToTry = modelOverride
    ? [modelOverride]
    : [
        modelSelection.model,
        ...GEMINI_ROTATION_MODELS.filter((m) => m !== modelSelection.model),
      ];

  const contactName = lead.name?.trim();
  const companyName = lead.company?.trim() || lead.name?.trim() || 'your company';
  const hasSpecificContactName =
    contactName &&
    contactName.toLowerCase() !== 'n/a' &&
    contactName.toLowerCase() !== 'hiring manager' &&
    contactName.toLowerCase() !== 'recruiter' &&
    (!lead.company || contactName.toLowerCase() !== lead.company.trim().toLowerCase());

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
- Company Context: Reaching out to ${companyName} (${lead.catName || 'software / tech space'}).
- Goal: Check if they have any full-stack or Gen AI engineering openings on their team right now.

Strict Content & Formatting Rules:
1. Salutation: ${salutationRule}
2. Accurately highlight:
   - "I'm Vishal, a full-stack developer (MERN + AI voice systems)."
   - Production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
   - Real-time multiplayer platform with full auth system (DPoP, rotating refresh tokens, device-level session management).
   - "Looking at ${companyName}'s work in ${lead.catName || 'tech'} and wanted to check — any full-stack or Gen AI engineering openings on your team right now?"
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
- Candidate Notes: ${customInstructions || 'Inquiring about full-stack or Gen AI openings.'}

Candidate Profile:
- Name: Vishal
- Role: Full-Stack Developer (MERN + Gen AI)
- Voice Agent Experience: Built production AI voice agent handling ~1,000 calls/day across multiple clients (sales and HR hiring pipelines) on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis).
- Auth & Real-Time Experience: Built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).
- Ask: Looking at ${companyName}'s work in ${lead.catName || 'tech'} and checking if there are any full-stack or Gen AI engineering openings on their team right now.
- GitHub: github.com/MrSanito
- Sign-off: Best, Vishal`;

  // Rotate through key and model combinations
  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx];
    const keyNumber = allKeys.indexOf(currentKey) + 1;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModelName = modelsToTry[mIdx];
      const model = getGeminiModel(currentKey, currentModelName, dynamicTemperature);
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

        const modelUsedLabel = `${currentModelName} (Key #${keyNumber || kIdx + 1} of ${allKeys.length}) [${archetype.name}]`;
        const keyUsedLabel = `Key #${keyNumber || kIdx + 1} of ${allKeys.length}`;

        // URL Sanitization: Keep github.com/MrSanito, sanitize unneeded/hallucinated third-party links
        const sanitizeUrlReferences = (str: string) => {
          if (!str) return '';
          return str
            .replace(/https?:\/\/voice\.solobuildai\.com[^\s<>"']*/gi, '')
            .replace(/voice\.solobuildai\.com/gi, '')
            .replace(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s<>"']*/gi, '');
        };

        const cleanedSubject = sanitizeUrlReferences(parsed.subject || `Full-Stack Developer (MERN + Gen AI) — ${companyName}`);
        const cleanedHtml = sanitizeUrlReferences(parsed.htmlBody || `<p>${parsed.textBody?.replace(/\n/g, '<br/>')}</p>`);
        const cleanedText = sanitizeUrlReferences(parsed.textBody || parsed.htmlBody?.replace(/<[^>]*>?/gm, ''));

        return {
          subject: cleanedSubject,
          htmlBody: cleanedHtml,
          textBody: cleanedText,
          isAiGenerated: true,
          modelUsed: modelUsedLabel,
          keyUsed: keyUsedLabel,
          latencyMs: Date.now() - startTime,
        };
      } catch (keyErr: unknown) {
        const errInfo = parseApiError(keyErr);
        console.warn(
          `[API Error ${errInfo.code} - ${errInfo.type}] on Model "${currentModelName}" (Key #${keyNumber || kIdx + 1} of ${allKeys.length}). Auto-rotating to next route:`,
          errInfo.message.slice(0, 120)
        );

        // For temporary throttling/conflict codes (429, 409, 503), apply jitter delay before next rotation
        if ([429, 409, 503].includes(Number(errInfo.code))) {
          await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 200));
        }
      }
    }
  }

  // Graceful fallback if all combinations fail (uses anti-spam rotating fallback templates)
  const latencyMs = Date.now() - startTime;
  const fallbackTpl = getRandomFallbackTemplate();
  const renderedSubject = renderTemplate(fallbackTpl.subject, lead);
  const renderedBody = renderTemplate(fallbackTpl.body, lead);

  return {
    subject: renderedSubject,
    htmlBody: renderedBody.replace(/\n/g, '<br/>'),
    textBody: renderedBody,
    isAiGenerated: false,
    latencyMs,
  };
}

/**
 * Test all available Gemini API keys & active rotation models in the pool
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  totalKeys: number;
  totalModels: number;
  rotationModels: string[];
  message: string;
  results?: Array<{ keyNumber: number; model: string; success: boolean; message: string; errorCode?: number | string }>;
}> {
  const keys = getAllGeminiApiKeys();
  if (keys.length === 0) {
    return {
      success: false,
      totalKeys: 0,
      totalModels: GEMINI_ROTATION_MODELS.length,
      rotationModels: GEMINI_ROTATION_MODELS,
      message: 'No GOOGLE_API_KEY or GEMINI_API_KEY found in environment.',
    };
  }

  const results = [];
  let successfulTests = 0;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    // Test with default fast model for each key
    const testModelName = GEMINI_ROTATION_MODELS[i % GEMINI_ROTATION_MODELS.length];
    try {
      const model = getGeminiModel(k, testModelName);
      if (!model) throw new Error('Could not create model instance');

      const res = await model.invoke([
        new HumanMessage('Say "Gemini Key Online!" in 3 words.'),
      ]);

      results.push({
        keyNumber: i + 1,
        model: testModelName,
        success: true,
        message: String(res.content || '').trim() || 'Online',
      });
      successfulTests++;
    } catch (e: unknown) {
      const errInfo = parseApiError(e);
      results.push({
        keyNumber: i + 1,
        model: testModelName,
        success: false,
        errorCode: errInfo.code,
        message: `HTTP ${errInfo.code} (${errInfo.type}): ${errInfo.message.slice(0, 80)}`,
      });
    }
  }

  return {
    success: successfulTests > 0,
    totalKeys: keys.length,
    totalModels: GEMINI_ROTATION_MODELS.length,
    rotationModels: GEMINI_ROTATION_MODELS,
    message: `${successfulTests} of ${keys.length} Google Gemini API keys active with ${GEMINI_ROTATION_MODELS.length} rotation models ready for randomized load balancing!`,
    results,
  };
}
