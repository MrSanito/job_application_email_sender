import { Lead } from '@/types';

export const DEFAULT_SUBJECT_TEMPLATE = 'Quick question regarding {{company}} / Vishal';

export const FALLBACK_TEMPLATES = [
  {
    subject: 'Full-Stack Developer / SoloBuild AI background — {{company}}',
    body: `Hi {{name}},

I've been following {{company}}'s work in {{catName}} and wanted to reach out directly regarding open engineering / full-stack developer roles.

I'm a hands-on full-stack developer (Founding Dev at SoloBuild AI) experienced in building end-to-end web apps and AI voice/calling agent pipelines (Next.js, TypeScript, Node.js, PostgreSQL/MongoDB, Redis queues, Pipecat, Gemini, Plivo, STT/TTS).

Attached my resume for quick reference. If you're open to a brief conversation, I'd love to connect.

Portfolio: https://zynito.in

Best regards,
Vishal Nishad
Full-Stack Developer`,
  },
  {
    subject: '{{company}} + Vishal (Full-Stack Developer)',
    body: `Hey {{name}},

Wanted to send a quick note regarding potential engineering roles at {{company}}.

I'm a full-stack developer with experience shipping complete web products, async backend pipelines, and real-time AI voice calling agents at SoloBuild AI (Next.js, Node.js, TypeScript, PostgreSQL, Redis, Pipecat, Gemini, Plivo).

My resume is attached with project details. Would love to chat if you're looking for an engineer who moves fast.

Portfolio: https://zynito.in

Thanks,
Vishal Nishad
Full-Stack Developer`,
  },
  {
    subject: 'Exploring full-stack opportunities at {{company}}',
    body: `Hello {{name}},

Reaching out to see if {{company}} is currently exploring new full-stack or backend additions to the engineering team.

As a founding developer at SoloBuild AI, I've built full-stack web applications, resilient backend queue architectures, and AI voice agent workflows end-to-end. 

Attached my resume for details. If the timing works, I'd be glad to jump on a short sync.

Portfolio: https://zynito.in

Best,
Vishal Nishad
Full-Stack Developer`,
  },
];

export const DEFAULT_BODY_TEMPLATE = FALLBACK_TEMPLATES[0].body;

export function getRandomFallbackTemplate(): { subject: string; body: string } {
  const index = Math.floor(Math.random() * FALLBACK_TEMPLATES.length);
  return FALLBACK_TEMPLATES[index];
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
    '{{catName}}': lead.catName || 'Engineering',
    '{{category}}': lead.catName || 'Engineering',
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
