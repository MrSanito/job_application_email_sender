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
    id: 'product-builder',
    name: 'Direct Product & Builder Angle',
    structuralPattern: 'Short 2-3 paragraph structure: Direct observation of their tech/domain -> Full-stack & AI calling agent background at SoloBuild AI -> Concrete way to contribute -> Quick ask.',
    openingStyle: 'Open directly with a genuine, specific observation about what the company builds or solves (zero generic flattery).',
    bodyStyle: 'Highlight founding developer background at SoloBuild AI building full-stack applications (Next.js, Node, TypeScript, PostgreSQL/MongoDB) and AI voice/calling agent pipelines (Pipecat, Gemini, Plivo, STT/TTS).',
    ctaStyle: 'Ask for a quick 5-minute chat if they are exploring full-stack additions. Mention attached resume.',
    subjectGuidance: 'e.g. "[Company] + Vishal (Full-Stack Dev)" or "Full-Stack Developer / SoloBuild AI background" or "[Company] engineering / Vishal"',
  },
  {
    id: 'ultra-concise',
    name: 'Ultra-Concise 3-Sentence Note',
    structuralPattern: 'Tight 3-sentence note (under 60 words total): Direct intro -> Core stack & SoloBuild AI founding background -> Attached resume & portfolio https://zynito.in.',
    openingStyle: 'Cut straight to the point without introductory throat-clearing.',
    bodyStyle: 'State role and expertise in 1 crisp sentence: hands-on full-stack developer (Next.js, TypeScript, Node.js, async queues, and AI voice calling agents).',
    ctaStyle: 'Casual CTA: "Attached my resume with project highlights — let me know if you are open to connecting."',
    subjectGuidance: 'e.g. "quick question re: [Company] tech" or "full-stack role at [Company]?" or "re: [Company] engineering"',
  },
  {
    id: 'systems-architecture',
    name: 'Full-Stack Architecture & High Velocity',
    structuralPattern: 'Speed & ownership framing: An engineer who takes full-stack features and voice AI systems from 0 to deployed production with minimal handholding.',
    openingStyle: 'Friendly, peer-to-peer technical greeting.',
    bodyStyle: 'Focus on shipping end-to-end: clean frontend interfaces, resilient backend APIs, async Redis queues, and real-time voice agent workflows.',
    ctaStyle: 'Ask if their engineering team has upcoming full-stack needs. Mention attached resume.',
    subjectGuidance: 'e.g. "Vishal Nishad — Full-Stack Developer (Next.js / Node / Voice AI)" or "Exploring software roles at [Company]"',
  },
  {
    id: 'inquisitive-sync',
    name: 'Conversational Inquisitive Angle',
    structuralPattern: 'Conversational curiosity: Reaching out to check on engineering team growth -> Quick snapshot of hands-on full-stack & AI calling agent experience -> Resume attached.',
    openingStyle: 'Inquire naturally about their current engineering roadmap or open developer seats.',
    bodyStyle: 'Explain background building SoloBuild AI and handling frontend, backend, and voice infrastructure end-to-end.',
    ctaStyle: 'Low-pressure ask for a short introductory exchange if timing aligns.',
    subjectGuidance: 'e.g. "Question regarding [Company] engineering" or "[Company] software roles / Vishal"',
  },
  {
    id: 'execution-impact',
    name: 'Execution & Practical Impact Angle',
    structuralPattern: 'Bullet/highlight format or punchy 2-paragraph flow: Brief intro -> 2 concise bullet points highlighting full-stack delivery and AI voice agent pipelines -> Low-friction signoff.',
    openingStyle: 'Natural, brief greeting referencing their engineering domain.',
    bodyStyle: 'Use 2 crisp bullet points or 2 tight sentences showing immediate impact (shipping full-stack features, building robust backend pipelines/voice agents).',
    ctaStyle: 'Mention attached resume and portfolio: https://zynito.in. Ask for a quick touchbase.',
    subjectGuidance: 'e.g. "Full-stack developer interested in [Company]" or "Engineering at [Company] / Vishal Nishad"',
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

  // Sign-off variation pool
  const signoffs = ['Best,', 'Thanks,', 'Cheers,', 'Warm regards,', 'Best regards,', 'Talk soon,'];
  const randomSignoff = signoffs[Math.floor(Math.random() * signoffs.length)];

  const systemPrompt = `You are a cold email deliverability and outreach expert writing a short, authentic, personalized cold email from a candidate reaching out directly regarding open full-stack / backend developer roles.

ANTI-SPAM & ANTI-FINGERPRINTING DIRECTIVES (CRITICAL):
- Avoid formulaic spam patterns, boilerplate sentence openers, or robotic structural fingerprints.
- DO NOT use generic spam phrases like: "I hope this email finds you well", "I came across your company", "I was impressed by", "I am writing to express my eager interest", "cutting-edge", "game-changer", "world-class", "if you need an extra pair of hands".
- Adopt this specific structural angle for this email: [${archetype.name}]
- Structural guidance: ${archetype.structuralPattern}
- Opening guidance: ${archetype.openingStyle}
- Body guidance: ${archetype.bodyStyle}
- CTA guidance: ${archetype.ctaStyle}
- Subject Line style: ${archetype.subjectGuidance}

Context:
- Company: ${companyName}
- Contact: ${hasSpecificContactName ? contactName : 'Engineering Team'}
- Website: ${lead.website || 'N/A'}
- Industry/focus: ${lead.catName || 'Software Engineering'}

Strict Content & Formatting Rules:
1. Salutation: ${salutationRule}
2. Position candidate honestly: Founding Developer at SoloBuild AI, hands-on full-stack developer (${profile.skills}).
3. Length: 55–90 words (crisp, human, easy to read on mobile).
4. Sign-off: End with "${randomSignoff}\\n${profile.name}\\nFull-Stack Developer\\nPortfolio: ${profile.portfolioUrl || 'https://zynito.in'}"
5. URLs: Include ONLY ${profile.portfolioUrl || 'https://zynito.in'} in the signature. Do NOT include any other URLs (no voice.solobuildai.com, no GitHub, no LinkedIn in the email body text — all links and full project details are in the attached resume).
6. Mention that resume is attached.
7. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

  const userPrompt = `Write a fresh, authentic job application email tailored for:
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
