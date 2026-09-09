import { Lead } from '@/types';

export const DEFAULT_SUBJECT_TEMPLATE = 'Quick question regarding {{company}} / Vishal';

export const DEFAULT_BODY_TEMPLATE = `Hi {{name}},

I've been following {{company}}'s work in {{catName}} and really like the problems you're solving — figured I'd reach out directly instead of just dropping an application into a form.

I'm a full-stack developer with hands-on experience building production web apps and AI-driven systems — Next.js/Node backends, async queue pipelines, and automation workflows. I'd love the chance to bring that to your team.

A couple of things I could contribute early on:
• Shipping features end-to-end across the stack (Next.js, TypeScript, Node.js, PostgreSQL/Prisma)
• Building reliable backend systems — APIs, async queues (Redis, BullMQ), and AI workflow integrations

If you're open to it, I'd really appreciate a quick 10-15 min chat about any openings or how I might fit in. I've also attached my resume for reference.

Portfolio: https://zynito.in

Thanks for considering,
Vishal Nishad
Full-Stack Developer | +91 63537 78872`;

export function renderTemplate(template: string, lead: Partial<Lead>, extraParams: Record<string, string> = {}): string {
  if (!template) return '';
  
  let result = template;
  
  const cleanCompany = lead.company?.trim() || 'your team';
  const cleanName = lead.name?.trim();
  const isGenericOrMissingName =
    !cleanName ||
    cleanName.toLowerCase() === 'n/a' ||
    cleanName.toLowerCase() === 'hiring manager' ||
    cleanName.toLowerCase() === 'recruiter' ||
    (lead.company && cleanName.toLowerCase() === lead.company.trim().toLowerCase());

  const salutationName = isGenericOrMissingName
    ? lead.company
      ? `${lead.company.trim()} team`
      : 'there'
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
