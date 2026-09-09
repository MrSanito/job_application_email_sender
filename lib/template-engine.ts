import { Lead } from '@/types';

export const ROTATING_SUBJECT_TEMPLATES: string[] = [
  'Full-Stack Developer (MERN + Gen AI) — open to opportunities',
  'Full-Stack Developer (MERN + Gen AI) — {{company}}',
  'Exploring Full-Stack / Gen AI Roles at {{company}}',
  'Quick question regarding Full-Stack / AI engineering at {{company}}',
  'Full-Stack & Gen AI Engineer — Application for {{company}}',
  'Full-Stack Dev (Next.js, Node, AI Voice Systems) — {{company}}',
  'Inquiring about {{catName}} / Full-Stack openings at {{company}}',
  'Software Engineer (MERN + Real-Time & Gen AI) — {{company}}',
  'Full-Stack Engineer interested in {{company}}\'s engineering team',
  'Open to full-stack / Gen AI roles — Vishal Nishad x {{company}}',
];

/**
 * Returns a randomly selected subject template from the 10 rotating options using Math.random()
 */
export function getRandomSubjectTemplate(): string {
  const index = Math.floor(Math.random() * ROTATING_SUBJECT_TEMPLATES.length);
  return ROTATING_SUBJECT_TEMPLATES[index];
}

/**
 * Renders a randomly rotated subject template for a specific lead using Math.random()
 */
export function getRandomRenderedSubject(lead: Partial<Lead>): string {
  const template = getRandomSubjectTemplate();
  return renderTemplate(template, lead);
}

export const DEFAULT_SUBJECT_TEMPLATE = ROTATING_SUBJECT_TEMPLATES[0];

export const FALLBACK_TEMPLATES = [
  {
    name: 'Direct & Product-Driven',
    subject: ROTATING_SUBJECT_TEMPLATES[0],
    body: `Hi {{name}},

I'm Vishal, a full-stack developer (MERN + AI voice systems). Recently I built a production AI voice agent handling ~1,000 calls/day across multiple clients — sales and HR hiring pipelines — on a Pipecat pipeline with real-time STT/TTS and a call queue backend (Node, BullMQ, Redis). I've also built a real-time multiplayer platform with a full auth system (DPoP, rotating refresh tokens, device-level session management).

Looking at {{company}}'s work in {{catName}} and wanted to check — any full-stack or Gen AI engineering openings on your team right now?

GitHub: github.com/MrSanito

Best,
Vishal`,
  },
  {
    name: 'Systems & Real-Time Scale Angle',
    subject: ROTATING_SUBJECT_TEMPLATES[1],
    body: `Hi {{name}},

Reaching out because I've been following {{company}}'s engineering work in {{catName}}.

I'm a full-stack and Gen AI engineer (MERN + Python/Pipecat). On the backend side, I recently architected a real-time voice AI system processing ~1,000 live calls daily with sub-second STT/TTS audio streams backed by Node, Redis, and BullMQ queues. In parallel, I shipped a distributed multiplayer platform with enterprise session security (DPoP, cryptographic refresh rotation).

Would love to know if {{company}} is currently hiring full-stack or Gen AI engineers?

GitHub: github.com/MrSanito

Best,
Vishal`,
  },
  {
    name: 'High-Impact & Pipeline Delivery Angle',
    subject: ROTATING_SUBJECT_TEMPLATES[2],
    body: `Hi {{name}},

Quick note to see if {{company}} has any open seats for a full-stack or Gen AI developer.

I specialize in MERN and voice agent infrastructure. Recently delivered an end-to-end Pipecat voice pipeline powering ~1,000 daily calls for sales & hiring workflows, managing queue concurrency via Node and Redis/BullMQ. I also engineered a high-throughput multiplayer web app with bulletproof auth (DPoP + session management).

Given {{company}}'s focus in {{catName}}, I'd love to contribute to your engineering velocity. Open to a brief chat?

GitHub: github.com/MrSanito

Best,
Vishal`,
  },
  {
    name: 'Product Velocity & Engineering Fit',
    subject: ROTATING_SUBJECT_TEMPLATES[3],
    body: `Hi {{name}},

I noticed the product updates at {{company}} around {{catName}} and wanted to connect directly.

I'm Vishal, a full-stack developer focused on modern web stacks and real-time AI. My latest production project is an automated AI voice agent serving ~1k calls/day across client hiring/sales pipelines (built with Pipecat, real-time STT/TTS, and BullMQ/Redis backend queues). Also developed a real-time multiplayer platform featuring strict DPoP session authentication.

Are there any full-stack or Gen AI openings on the engineering team at {{company}}?

GitHub: github.com/MrSanito

Best,
Vishal`,
  },
  {
    name: 'Conversational & Architecture Focus',
    subject: ROTATING_SUBJECT_TEMPLATES[4],
    body: `Hi {{name}},

Hope you're having a productive week. Wanted to check if {{company}} is expanding its engineering team in full-stack or Gen AI.

A quick snapshot of my work: full-stack developer (MERN) with hands-on production experience scaling AI voice agents to ~1,000 calls/day using Pipecat real-time audio pipelines and BullMQ/Redis. I also built a secure multiplayer platform implementing DPoP tokens and device-level session architecture.

Would love to explore whether my skill set could help {{company}}'s technical roadmap in {{catName}}.

GitHub: github.com/MrSanito

Best,
Vishal`,
  },
];

export const DEFAULT_BODY_TEMPLATE = FALLBACK_TEMPLATES[0].body;

export function getRandomBodyTemplate(): string {
  const index = Math.floor(Math.random() * FALLBACK_TEMPLATES.length);
  return FALLBACK_TEMPLATES[index].body;
}

export function getRandomFallbackTemplate(): { subject: string; body: string } {
  const index = Math.floor(Math.random() * FALLBACK_TEMPLATES.length);
  const fallback = FALLBACK_TEMPLATES[index];
  return {
    subject: getRandomSubjectTemplate(),
    body: fallback.body,
  };
}

export function renderTemplate(template: string, lead: Partial<Lead>, extraParams: Record<string, string> = {}): string {
  if (!template) return '';
  
  let result = template;
  
  const cleanCompany = lead.company?.trim() || 'your company';
  const cleanName = lead.name?.trim();
  const isGenericOrMissingName =
    !cleanName ||
    cleanName.toLowerCase() === 'n/a' ||
    cleanName.toLowerCase() === 'hiring manager' ||
    cleanName.toLowerCase() === 'recruiter' ||
    cleanName.toLowerCase() === 'team' ||
    (lead.company && cleanName.toLowerCase() === lead.company.trim().toLowerCase());

  const salutationName = isGenericOrMissingName
    ? 'there'
    : cleanName;

  const replacements: Record<string, string> = {
    '{{name}}': salutationName,
    '{{company}}': cleanCompany,
    '{{catName}}': lead.catName || 'software & engineering',
    '{{category}}': lead.catName || 'software & engineering',
    '{{space}}': lead.catName || 'software & tech',
    '{{product}}': lead.catName || 'products',
    '[name]': salutationName,
    '[company]': cleanCompany,
    '[space/product]': lead.catName || 'software & tech',
    '{{jobTitle}}': lead.catName || 'Developer',
    '{{email}}': lead.email || '',
    '{{address}}': lead.address || 'Remote / Hybrid',
    '{{location}}': lead.address || 'Remote / Hybrid',
    '{{phone}}': lead.phone || '',
    '{{website}}': lead.website || '',
    ...extraParams,
  };

  // Add custom fields
  if (lead.customFields) {
    Object.entries(lead.customFields).forEach(([key, val]) => {
      replacements[`{{${key}}}`] = String(val);
    });
  }

  // Replace all tags
  Object.entries(replacements).forEach(([tag, value]) => {
    const escapedTag = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedTag, 'gi'), value);
  });

  return result;
}
