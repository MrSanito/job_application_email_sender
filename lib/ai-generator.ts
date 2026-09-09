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
 * Collect all configured Google/Gemini API keys from environment
 */
export function getAllGeminiApiKeys(): string[] {
  const candidates: (string | undefined)[] = [
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_API_KEY2,
    process.env.GOOGLE_API_KEY_2,
    process.env['GOOGLE-API-KEY2'],
    process.env['GOOGLE-API-KEY-2'],
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ];

  // Dynamically scan any other matching env variables
  for (const [k, v] of Object.entries(process.env)) {
    const upper = k.toUpperCase();
    if (
      (upper.startsWith('GOOGLE_API_KEY') ||
        upper.startsWith('GEMINI_API_KEY') ||
        upper.startsWith('GOOGLE-API-KEY')) &&
      typeof v === 'string'
    ) {
      candidates.push(v);
    }
  }

  const clean = candidates
    .filter((k): k is string => Boolean(k && typeof k === 'string'))
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter((k) => k.length > 5);

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
  'gemini-flash-latest',
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
      'Next.js, React, Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, MongoDB, Gemini API, Socket.io',
    portfolioUrl: candidateProfile?.portfolioUrl || 'https://zynito.in',
    experienceSummary:
      candidateProfile?.experienceSummary ||
      'Full-stack developer building production web apps, real-time WebSocket systems, async BullMQ/Redis pipelines, and open-source contributor to Corsair (10k+ stars).',
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
  const companyName = lead.company?.trim() || lead.name?.trim() || 'the team';
  const hasSpecificContactName =
    contactName &&
    contactName.toLowerCase() !== 'n/a' &&
    contactName.toLowerCase() !== 'hiring manager' &&
    contactName.toLowerCase() !== 'recruiter' &&
    (!lead.company || contactName.toLowerCase() !== lead.company.trim().toLowerCase());

  const salutationRule = hasSpecificContactName
    ? `Greet the contact naturally by first name: "Hi ${contactName.split(' ')[0]},"`
    : `No individual contact/HR name is provided. Greet the team naturally: "Hi ${companyName} team," or "Hi ${companyName} engineering team," (NEVER use "Hi ${companyName}," as if the company was a person's first name, and NEVER use "Hi Hiring Manager," or "Hi null,")`;

  const systemPrompt = `You are writing a short, honest, personalized job outreach email — a candidate reaching out directly to a company expressing interest in joining their team (NOT a freelance/consulting pitch, NOT a sales email).

Context:
- Company: ${companyName}
- Contact: ${hasSpecificContactName ? contactName : 'Team / Engineering'}
- Website: ${lead.website || 'N/A'}
- Industry/focus: ${lead.catName || 'Engineering'}

Rules:
1. Salutation: ${salutationRule}
2. Open with ONE specific, genuine line about the company's product or tech — no generic flattery like "impressive team."
3. Make clear this is about wanting to join their team, not offering freelance/contract services. Position the candidate honestly: skilled and hands-on, NOT "senior," "world-class," or "extensive experience." Ground it in real skills (${profile.skills}) and shipped projects.
4. Give 2 concrete things the candidate could contribute as a team member — no buzzword soup.
5. Tone: conversational, confident, humble. Never use: "I hope this email finds you well," "I am writing to express my interest," "extensive experience," "world-class," "if you ever need extra hands."
6. Length: 90–130 words.
7. Close by asking about open roles or a quick chat about fit on the team — not "hiring me as a contractor." Mention that resume is attached.
8. Signature: Add ONLY the candidate's portfolio URL (${profile.portfolioUrl || 'https://zynito.in'}). Do NOT include GitHub or LinkedIn links in the email body (they are already included inside the attached resume).
9. Output ONLY valid JSON: {"subject": "...", "htmlBody": "...", "textBody": "..."}. Subject under 8 words. No markdown fences.`;

  const userPrompt = `Write a personalized job application email for:
Target Recipient & Company:
- Recipient Name: ${hasSpecificContactName ? contactName : `[No HR Name - Address as ${companyName} team]`}
- Company: ${companyName}
- Industry / Focus: ${lead.catName || 'Software Development'}
- Website / Domain: ${lead.website || 'N/A'}
- City / Location: ${lead.address || 'Remote'}
- Candidate Notes: ${customInstructions || 'Genuine interest in joining their engineering team.'}

Candidate Profile:
- Name: ${profile.name}
- Current Role: ${profile.role}
- Core Skills: ${profile.skills}
- Portfolio: ${profile.portfolioUrl || 'https://zynito.in'} (include ONLY this link in signature, omit GitHub/LinkedIn from email text)
- Shipped Work: Built real-time multiplayer systems with Socket.io/BullMQ/Redis, full-stack Next.js/Node apps, and contributed 12.6k lines of TS to Corsair (10k+ stars).`;

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

        return {
          subject: parsed.subject || `Quick question regarding ${lead.company || 'your team'} / ${profile.name}`,
          htmlBody: parsed.htmlBody || `<p>${parsed.textBody?.replace(/\n/g, '<br/>')}</p>`,
          textBody: parsed.textBody || parsed.htmlBody?.replace(/<[^>]*>?/gm, ''),
          isAiGenerated: true,
          modelUsed: modelUsedLabel,
          keyUsed: keyUsedLabel,
          latencyMs: Date.now() - startTime,
        };
      } catch (keyErr) {
        console.warn(`[Model: ${currentModelName}, Key #${keyNumber || kIdx + 1}] failed, rotating:`, keyErr);
        // Continue to next model/key combination
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
  results?: Array<{ keyNumber: number; model: string; success: boolean; message: string }>;
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
      results.push({
        keyNumber: i + 1,
        model: testModelName,
        success: false,
        message: e instanceof Error ? e.message : 'API test failed',
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
