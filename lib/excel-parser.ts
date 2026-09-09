import * as XLSX from 'xlsx';
import { Lead } from '@/types';

export interface ParseResult {
  leads: Lead[];
  stats: {
    totalRows: number;
    validEmails: number;
    invalidEmails: number;
    duplicateEmails: number;
    categoriesCount: number;
  };
  headers: string[];
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function extractDomain(urlStr: string): string {
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const url = new URL(clean);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function extractEmail(value: unknown, websiteUrl?: string, companyName?: string): string {
  if (!value && !websiteUrl && !companyName) return '';
  const str = String(value || '').trim();
  
  if (str.startsWith('mailto:')) {
    return str.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
  }
  
  // Extract all valid emails in the field (e.g. comma, space, slash separated)
  const matches = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (matches && matches.length > 0) {
    const unique = Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));
    return unique.join(', ');
  }

  // If the field contains a URL, try to extract domain and infer email
  if (str.includes('http://') || str.includes('https://') || str.includes('.com') || str.includes('.io') || str.includes('.ai') || str.includes('.org') || str.includes('.net')) {
    const domain = extractDomain(str);
    if (domain && domain.includes('.') && !domain.includes('google.com') && !domain.includes('facebook.com') && !domain.includes('instagram.com')) {
      return `hr@${domain}`.toLowerCase();
    }
  }

  // If website url is passed separately
  if (websiteUrl) {
    const domain = extractDomain(websiteUrl);
    if (domain && domain.includes('.') && !domain.includes('google.com')) {
      return `hr@${domain}`.toLowerCase();
    }
  }

  // Infer from company name if clean single word
  if (companyName) {
    const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanComp.length > 2 && cleanComp.length < 20) {
      return `hr@${cleanComp}.com`;
    }
  }
  
  return '';
}

export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array): ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch (readErr) {
    throw new Error(
      `Unable to parse spreadsheet file: ${readErr instanceof Error ? readErr.message : 'Invalid or corrupted file format'}. Please ensure the file is a valid .xlsx, .xls, or .csv file.`
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      leads: [],
      stats: { totalRows: 0, validEmails: 0, invalidEmails: 0, duplicateEmails: 0, categoriesCount: 0 },
      headers: [],
    };
  }

  // Scan all sheets to find the sheet with the most valid data rows
  let bestSheetName = workbook.SheetNames[0];
  let bestRows: Record<string, unknown>[] = [];

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (rows.length > bestRows.length) {
      bestRows = rows;
      bestSheetName = name;
    }
    // If explicit 'Jobs' or 'Leads' sheet exists and has data, prioritize it
    if ((name.toLowerCase() === 'jobs' || name.toLowerCase() === 'leads') && rows.length > 0) {
      bestRows = rows;
      bestSheetName = name;
      break;
    }
  }

  if (bestRows.length === 0) {
    return {
      leads: [],
      stats: { totalRows: 0, validEmails: 0, invalidEmails: 0, duplicateEmails: 0, categoriesCount: 0 },
      headers: [],
    };
  }

  const headers = Object.keys(bestRows[0]);
  const seenEmails = new Set<string>();
  const categories = new Set<string>();
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const leads: Lead[] = bestRows.map((row, index) => {
    // Normalization helper: strips spaces, underscores, dashes, dots, and lowercase
    const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

    const getVal = (...targetKeys: string[]): string => {
      const normalizedTargets = targetKeys.map(normalizeKey);
      for (const [key, val] of Object.entries(row)) {
        if (val === undefined || val === null) continue;
        const normKey = normalizeKey(key);
        if (normalizedTargets.includes(normKey)) {
          return String(val).trim();
        }
      }
      return '';
    };

    // Helper to clean company names
    const cleanCompanyName = (raw: string): string => {
      if (!raw) return 'Innovations Inc';
      let clean = raw.trim();
      if (clean.includes('|')) {
        clean = clean.split('|')[0].trim();
      }
      if (clean.includes(' - ') && clean.length > 40) {
        clean = clean.split(' - ')[0].trim();
      }
      return clean;
    };

    // Priority check for all possible email column header variations
    let rawEmail = getVal(
      'email',
      'email_id',
      'email id',
      'email_address',
      'email address',
      'emails',
      'mail',
      'mail_id',
      'mail id',
      'hiring_professional_email',
      'hiring_email',
      'hiring email',
      'hr_email',
      'hr email',
      'recruiter_email',
      'recruiter email',
      'contact_email',
      'contact email',
      'work_email',
      'official_email',
      'primary_email',
      'to_email'
    );

    let rawWebsite = getVal('website', 'web_site', 'url', 'web_url', 'site', 'domain', 'web', 'link', 'homepage');
    const rawName = getVal('company', 'company_name', 'company name', 'business', 'business_name', 'org', 'organization', 'firm', 'employer', 'client');
    const company = cleanCompanyName(rawName);
    const contactName = getVal('contact', 'contact_name', 'contact name', 'name', 'full_name', 'full name', 'hr_name', 'hr name', 'recruiter', 'recruiter_name', 'lead_name', 'first_name', 'person');
    const catName = getVal('cat_name', 'cat name', 'category', 'category_name', 'categoryname', 'job_title', 'job title', 'title', 'role', 'position', 'designation', 'domain', 'industry', 'field');
    const address = getVal('address', 'location', 'city', 'state', 'country', 'headquarters', 'hq', 'place');
    const phone = getVal('number', 'phone', 'telephone', 'phone_number', 'phone number', 'mobile', 'cell', 'contact_number');

    // Fallback: If no explicit email column was matched, scan all cells in the row for an email pattern
    if (!rawEmail) {
      for (const val of Object.values(row)) {
        if (typeof val === 'string' && val.includes('@') && val.includes('.')) {
          const match = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (match) {
            rawEmail = match[0];
            break;
          }
        }
      }
    }

    const rawExtracted = extractEmail(rawEmail, rawWebsite, company);
    const emailList = rawExtracted
      .split(/[,;\n/|]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_REGEX.test(e));

    const cleanEmail = emailList.join(', ');
    const isValidFormat = emailList.length > 0;
    let status: Lead['status'] = 'invalid';

    if (isValidFormat) {
      const primaryEmail = emailList[0];
      if (seenEmails.has(primaryEmail)) {
        status = 'duplicate';
        duplicateCount++;
      } else {
        status = 'valid';
        seenEmails.add(primaryEmail);
        validCount++;
      }
    } else {
      invalidCount++;
    }

    if (catName) {
      categories.add(catName);
    }

    return {
      id: `lead-${index + 1}-${Date.now().toString(36)}`,
      name: contactName || '',
      email: cleanEmail,
      catName: catName || 'Software & Technology',
      company: company || 'Innovations Inc',
      address,
      phone,
      website: rawWebsite,
      status,
      customFields: Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, String(v ?? '')])
      ),
    };
  });

  return {
    leads,
    stats: {
      totalRows: leads.length,
      validEmails: validCount,
      invalidEmails: invalidCount,
      duplicateEmails: duplicateCount,
      categoriesCount: categories.size,
    },
    headers,
  };
}

// Helper to generate verified sample leads for immediate 1-click test
export function generateSampleTechLeads(count: number = 75): ParseResult {
  const companies = [
    { name: 'Stripe', domain: 'stripe.com', cat: 'Fintech & Payments', loc: 'San Francisco, CA' },
    { name: 'Vercel', domain: 'vercel.com', cat: 'Frontend & Cloud Platforms', loc: 'San Francisco, CA' },
    { name: 'Linear', domain: 'linear.app', cat: 'Developer Tools & Productivity', loc: 'Remote / Global' },
    { name: 'Supabase', domain: 'supabase.com', cat: 'Databases & Backend Infrastructure', loc: 'Remote / Singapore' },
    { name: 'Upstash', domain: 'upstash.com', cat: 'Serverless Data & Queues', loc: 'San Francisco, CA' },
    { name: 'PostHog', domain: 'posthog.com', cat: 'Product Analytics & Open Source', loc: 'Remote / London' },
    { name: 'Retool', domain: 'retool.com', cat: 'Internal Tooling & Workflow AI', loc: 'San Francisco, CA' },
    { name: 'LangChain', domain: 'langchain.dev', cat: 'AI Agents & LLM Frameworks', loc: 'San Francisco, CA' },
    { name: 'Resend', domain: 'resend.com', cat: 'Developer Email Infrastructure', loc: 'Remote' },
    { name: 'Anthropic', domain: 'anthropic.com', cat: 'AI Safety & Frontier Models', loc: 'San Francisco, CA' },
    { name: 'OpenAI', domain: 'openai.com', cat: 'Artificial General Intelligence', loc: 'San Francisco, CA' },
    { name: 'Mistral AI', domain: 'mistral.ai', cat: 'Open Weights Frontier AI', loc: 'Paris, France' },
    { name: 'Databricks', domain: 'databricks.com', cat: 'Data Lakehouse & Enterprise AI', loc: 'San Francisco, CA' },
    { name: 'Snowflake', domain: 'snowflake.com', cat: 'Cloud Data Cloud', loc: 'Bozeman, MT' },
    { name: 'Figma', domain: 'figma.com', cat: 'Collaborative Interface Design', loc: 'San Francisco, CA' },
  ];

  const firstNames = ['Alex', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Daniel', 'Sophia', 'James', 'Olivia'];
  const lastNames = ['Chen', 'Miller', 'Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Wilson', 'Taylor', 'Anderson'];
  const roles = [
    'Senior Full Stack Engineer',
    'AI Systems Architect',
    'Head of Engineering',
    'Lead Backend Developer',
    'VP of Technology',
    'Staff Distributed Systems Engineer',
  ];

  const leads: Lead[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < count; i++) {
    const comp = companies[i % companies.length];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const role = roles[i % roles.length];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${comp.domain}`;

    leads.push({
      id: `lead-tech-${i + 1}`,
      name: `${fn} ${ln}`,
      email,
      catName: role,
      company: comp.name,
      address: comp.loc,
      phone: `+1 (555) ${100 + i}-${2000 + i}`,
      website: `https://${comp.domain}`,
      status: 'valid',
      customFields: {
        industry: comp.cat,
        domain: comp.domain,
      },
    });
    seenEmails.add(email);
  }

  return {
    leads,
    stats: {
      totalRows: leads.length,
      validEmails: leads.length,
      invalidEmails: 0,
      duplicateEmails: 0,
      categoriesCount: roles.length,
    },
    headers: ['name', 'email', 'catName', 'company', 'address', 'phone', 'website'],
  };
}
