import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function dispatch2RealLeads() {
  console.log('================================================================');
  console.log('🚀 DISPATCHING 2 REAL-WORLD LEADS FROM DATA.XLSX');
  console.log('   (Sending single unified email to all 2-3 company addresses)');
  console.log('================================================================\n');

  const appUrl = 'http://localhost:3000';

  const realLeads = [
    {
      id: 'lead-real-arth',
      name: '', // company only -> triggers smart team salutation
      company: 'Arth Technology',
      email: 'hr@arthtechnology.com, contact@arthtechnology.com, info@arthtechnology.com',
      catName: 'Software & Web Development Solutions',
      website: 'https://arthtechnology.com/',
      address: 'Vadodara, Gujarat, India',
      phone: '+91 97267 52500',
      status: 'valid',
    },
    {
      id: 'lead-real-novumlogic',
      name: '', // company only -> triggers smart team salutation
      company: 'Novumlogic Technologies Pvt Ltd',
      email: 'careers@novumlogic.com, hr@novumlogic.com, info@novumlogic.com',
      catName: 'Product Engineering & Software Development',
      website: 'https://www.novumlogic.com/',
      address: 'Vadodara, Gujarat, India',
      phone: '+91 99134 81289',
      status: 'valid',
    }
  ];

  // 1. Create a campaign with these 2 real leads
  const payload = {
    name: 'Real Outreach Campaign (Arth Technology & Novumlogic)',
    leads: realLeads,
    config: {
      emailsPerDay: 50,
      intervalSeconds: 15,
      batchesPerDay: 1,
      startHour: 9,
      endHour: 18,
      subjectTemplate: 'Quick question regarding {{company}} / Vishal',
      bodyTemplate: 'Hi {{name}},\n\nI have been following {{company}}\'s work in {{catName}}.',
      customInstructions: 'Short, honest outreach expressing genuine interest in joining their engineering team. Mention attached resume.',
      candidateName: 'Vishal Nishad',
      candidateRole: 'Full-Stack Developer',
      candidateSkills: 'Next.js, React, Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, MongoDB, Mistral AI, Socket.io',
      candidatePortfolio: 'https://github.com/MrSanito',
    }
  };

  console.log('1️⃣ Creating campaign via /api/campaign/create...');
  const createRes = await fetch(`${appUrl}/api/campaign/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json();
  console.log('  Create Status:', createRes.status);
  console.log('  Campaign ID:', createData.campaignId || createData.campaign?.id);
  console.log('  Jobs Queued:', createData.campaign?.jobs?.length);

  if (!createData.success) {
    console.error('  ❌ Error creating campaign:', createData.error);
    return;
  }

  console.log('\n2️⃣ Triggering next 2 queued jobs via /api/queue/trigger-next...');
  const triggerRes = await fetch(`${appUrl}/api/queue/trigger-next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 2 }),
  });

  const triggerData = await triggerRes.json();
  console.log('  Trigger Status:', triggerRes.status);
  console.log('  Processed Count:', triggerData.processedCount);

  if (triggerData.results && triggerData.results.length > 0) {
    console.log('\n================================================================');
    console.log('📨 LIVE EMAIL GENERATION & DISPATCH RESULTS');
    console.log('================================================================');

    triggerData.results.forEach((res, idx) => {
      console.log(`\n--- [OUTREACH #${idx + 1}] Company: ${res.leadCompany} ---`);
      console.log(`• Unified Recipient(s): ${res.leadEmail}`);
      console.log(`• Delivery Status:      ${res.status.toUpperCase()}`);
      console.log(`• Subject Line:         "${res.subject}"`);
      console.log(`• AI Model Used:        ${res.modelUsed}`);
      console.log(`• Message ID:           ${res.messageId || 'N/A'}`);
      console.log(`• Latency:              ${res.durationMs}ms`);
      console.log('\n📄 RENDERED EMAIL BODY (Delivered to Company):');
      console.log('----------------------------------------------------');
      console.log(res.textBody || res.htmlBody?.replace(/<[^>]*>?/gm, ''));
      console.log('----------------------------------------------------');
    });
  } else {
    console.log('  Results:', JSON.stringify(triggerData));
  }

  console.log('\n================================================================');
  console.log('🎉 2 REAL-WORLD LEADS DISPATCHED WITH RESUME ATTACHED');
  console.log('================================================================');
}

dispatch2RealLeads().catch(console.error);
