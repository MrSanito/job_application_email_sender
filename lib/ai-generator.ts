import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Lead } from '@/types';
import { renderTemplate, DEFAULT_BODY_TEMPLATE, DEFAULT_SUBJECT_TEMPLATE } from './template-engine';

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
  modelName: string = 'gemini-2.5-flash'
): ChatGoogleGenerativeAI | null {
  if (!apiKey) return null;

  try {
    return new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey,
      temperature: 0.7,
      maxRetries: 2,
    });
  } catch (error) {
    console.error(`Error initializing ChatGoogleGenerativeAI (${modelName}):`, error);
    return null;
  }
}

/**
 * Dynamically generate on-the-spot personalized cold email HTML and subject using LangChain + Google Gen AI
 * Uses randomized model and key selection across all configured keys & models with automatic failover!
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

  // Default candidate profile from verified resume
  const profile: CandidateProfile = {
    name: candidateProfile?.name || 'Vishal Nishad',
    role: candidateProfile?.role || 'Full-Stack Developer',
    skills:
      candidateProfile?.skills ||
      'Next.js, React, Node.js, TypeScript, PostgreSQL, MongoDB, Redis, BullMQ, AI Voice & Calling Agents (Pipecat, Gemini, Plivo, STT/TTS)',
    portfolioUrl: candidateProfile?.portfolioUrl || 'https://zynito.in',
    experienceSummary:
      candidateProfile?.experienceSummary ||
      'Founding Developer at SoloBuild AI building full-stack web applications, async queue pipelines, and AI voice/calling agent systems (Pipecat, Gemini, Plivo, STT/TTS) end-to-end.',
  };

  if (!keySelection) {
    // Graceful fallback to dynamic template interpolation
    const renderedSubject = renderTemplate(DEFAULT_SUBJECT_TEMPLATE, lead);
    const renderedBody = renderTemplate(DEFAULT_BODY_TEMPLATE, lead);

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

  const salutationRule = hasSpecificContactName
    ? `Greet the contact naturally by first name: "Hi ${contactName.split(' ')[0]},"`
    : `No individual contact/HR name is provided. Greet naturally: "Hi there," or "Hello," (STRICT RULE: Do NOT write "team", NEVER use "Hi ${companyName} team," or "Hi team," or "Dear team").`;

  const systemPrompt = `You are writing a short, honest, personalized job outreach email — a candidate reaching out directly to a company expressing interest in open full-stack / backend developer roles (NOT a freelance/consulting pitch, NOT a sales email).

Context:
- Company: ${companyName}
- Contact: ${hasSpecificContactName ? contactName : 'Software Engineering'}
- Website: ${lead.website || 'N/A'}
- Industry/focus: ${lead.catName || 'Engineering'}

Rules:
1. Salutation: ${salutationRule}
2. Open with ONE specific, genuine line about the company's product or tech — no generic flattery like "impressive work."
3. Position the candidate honestly: a hands-on full-stack developer who founded SoloBuild AI, building full-stack web applications and AI voice/calling agent pipelines (${profile.skills}). Keep it short, simple, and grounded.
4. Give 1-2 concrete ways the candidate could contribute (e.g. shipping full-stack features, building robust backend APIs/queues, or AI voice/calling agent integrations) — no buzzword soup.
5. Tone: conversational, confident, humble. Never use: "I hope this email finds you well," "I am writing to express my interest," "extensive experience," "world-class," "if you ever need extra hands."
6. Avoid repeating or writing "team" in greetings (do NOT use "Hi team" or "Hi [Company] team").
7. Length: 70–95 words (keep it short and simple).
8. Close by asking about open engineering roles or a quick chat. Mention that resume is attached.
9. Signature: Add ONLY the candidate's portfolio URL (${profile.portfolioUrl || 'https://zynito.in'}). Do NOT include any other URLs (no voice.solobuildai.com, no GitHub, no LinkedIn in the email body text — all links and full project details are in the attached resume).
10. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

  const userPrompt = `Write a short and simple job application email for:
Target Recipient & Company:
- Recipient Name: ${hasSpecificContactName ? contactName : `[No HR Name - Greet as "Hi there," or "Hello,"]`}
- Company: ${companyName}
- Industry / Focus: ${lead.catName || 'Software Development'}
- Website / Domain: ${lead.website || 'N/A'}
- City / Location: ${lead.address || 'Remote'}
- Candidate Notes: ${customInstructions || 'Genuine interest in joining as a full-stack developer.'}

Candidate Profile (from Resume):
- Name: ${profile.name}
- Current Role: ${profile.role}
- Core Skills: ${profile.skills}
- Portfolio: ${profile.portfolioUrl || 'https://zynito.in'} (include ONLY this link in signature, do NOT add any other URLs in email text)
- Background: Founding Developer at SoloBuild AI — built and shipped full-stack web applications, async Redis/BullMQ pipelines, and AI voice/calling agent systems (Pipecat, Gemini, Plivo, STT/TTS) end-to-end.`;

  // Rotate through key and model combinations
  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx];
    const keyNumber = allKeys.indexOf(currentKey) + 1;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModelName = modelsToTry[mIdx];
      const model = getGeminiModel(currentKey, currentModelName);
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

        const modelUsedLabel = `${currentModelName} (Key #${keyNumber || kIdx + 1} of ${allKeys.length})`;
        const keyUsedLabel = `Key #${keyNumber || kIdx + 1} of ${allKeys.length}`;

        // URL Sanitization: Ensure NO voice.solobuildai.com, github, or linkedin URLs exist in the email body (only zynito.in)
        const sanitizeUrlReferences = (str: string) => {
          if (!str) return '';
          return str
            .replace(/https?:\/\/voice\.solobuildai\.com[^\s<>"']*/gi, '')
            .replace(/voice\.solobuildai\.com/gi, '')
            .replace(/https?:\/\/(?:www\.)?github\.com\/[^\s<>"']*/gi, '')
            .replace(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s<>"']*/gi, '');
        };

        const cleanedSubject = sanitizeUrlReferences(parsed.subject || `Quick question regarding ${lead.company || 'your team'} / ${profile.name}`);
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

  // Graceful fallback if all combinations fail
  const latencyMs = Date.now() - startTime;
  const renderedSubject = renderTemplate(DEFAULT_SUBJECT_TEMPLATE, lead);
  const renderedBody = renderTemplate(DEFAULT_BODY_TEMPLATE, lead);

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
