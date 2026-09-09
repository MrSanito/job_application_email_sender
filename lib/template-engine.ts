import { Lead } from '@/types';

export const DEFAULT_SUBJECT_TEMPLATE = 'Quick question regarding {{company}} / Vishal';

export const DEFAULT_BODY_TEMPLATE = `Hi {{name}},

I've been following {{company}}'s work in {{catName}} and really like what you're building — wanted to reach out directly regarding open engineering and full-stack developer roles.

I'm a hands-on full-stack developer experienced in building and shipping products end-to-end (Next.js, TypeScript, Node.js, PostgreSQL/MongoDB, Redis queues, and AI voice/calling agents with Pipecat, Gemini, Plivo, STT/TTS).

A couple of ways I can contribute right away:
• Shipping clean full-stack features end-to-end across frontend and backend
• Building robust APIs, async queues, or AI voice & calling agent integrations

If you're hiring or open to connecting, I'd love a quick chat. My resume is attached for reference.

Portfolio: https://zynito.in

Best regards,
Vishal Nishad
Full-Stack Developer`;

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
