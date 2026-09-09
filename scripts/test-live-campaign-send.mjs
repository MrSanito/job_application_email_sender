import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
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
}

async function testLiveOutreach() {
  console.log('================================================================');
  console.log('🚀 TESTING LIVE RESEARCH-BACKED OUTREACH & DISPATCH (2 LEADS)');
  console.log('================================================================\n');

  const appUrl = 'http://localhost:3000';

  // 1. Create a live test campaign with 2 targeted leads
  const testPayload = {
    name: 'Deeply Researched Outreach Test (2 Leads)',
    leads: [
      {
        id: 'lead-test-01',
        name: 'Alex Rivera',
        email: 'vishalni2005+vercel@gmail.com',
        company: 'Vercel',
        catName: 'Next.js & Frontend Edge Infrastructure',
        website: 'https://vercel.com',
        address: 'San Francisco, CA',
        phone: '+1 415 555 0192',
        status: 'valid',
      },
      {
        id: 'lead-test-02',
        name: 'Elena Rostova',
        email: 'vishalni2005+stripe@gmail.com',
        company: 'Stripe',
        catName: 'High-Throughput Distributed Systems & Payments',
        website: 'https://stripe.com',
        address: 'Seattle, WA',
        phone: '+1 206 555 0148',
        status: 'valid',
      }
    ],
    config: {
      emailsPerDay: 50,
      intervalSeconds: 15,
      batchesPerDay: 2,
      startHour: 9,
      endHour: 18,
      randomJitter: true,
      subjectTemplate: 'Quick question regarding engineering at {{Company}} - Vishal',
      bodyTemplate: 'Hi {{Name}},\n\nI have been following {{Company}}\'s work in {{Category}}.',
      customInstructions: 'Conduct deep research on their product and tech stack. Detail 2-3 specific technical contributions (e.g. Next.js App Router performance, LangChain AI pipelines, resilient async background queues with Upstash & MongoDB). Make it sound 100% human and personal.',
      candidateName: 'Vishal',
      candidateRole: 'Senior Full Stack & AI Engineer',
      candidateSkills: 'Next.js, TypeScript, Python, Mistral AI LangChain, Upstash/Redis, Microservices, MongoDB',
      candidatePortfolio: 'https://github.com/vishal',
    }
  };

  console.log('1️⃣ Creating campaign via API endpoint (/api/campaign/create)...');
  try {
    const createRes = await fetch(`${appUrl}/api/campaign/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const createData = await createRes.json();
    console.log('  Create Response Status:', createRes.status);
    console.log('  Campaign ID:', createData.campaignId || createData.campaign?.id);
    console.log('  Jobs Queued:', createData.campaign?.jobs?.length || 0);

    if (!createData.success) {
      console.error('  ❌ Campaign creation error:', createData.error);
      return;
    }

    console.log('\n2️⃣ Triggering next 2 queued emails via (/api/queue/trigger-next)...');
    const triggerRes = await fetch(`${appUrl}/api/queue/trigger-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 2 }),
    });

    const triggerData = await triggerRes.json();
    console.log('  Trigger Status:', triggerRes.status);
    console.log('  Processed Jobs Count:', triggerData.processedCount);

    if (triggerData.results && triggerData.results.length > 0) {
      console.log('\n================================================================');
      console.log('📨 LIVE EMAIL GENERATION & DISPATCH RESULTS');
      console.log('================================================================');

      triggerData.results.forEach((res, idx) => {
        console.log(`\n--- [Email #${idx + 1}] To: ${res.leadEmail} (${res.leadCompany}) ---`);
        console.log(`• Status:        ${res.status}`);
        console.log(`• Subject:       ${res.subject}`);
        console.log(`• AI Model Used: ${res.modelUsed}`);
        console.log(`• Delivered via: ${res.isSimulated ? '⚠️ Simulation' : '✅ REAL GMAIL SMTP (Sent to Inbox)'}`);
        console.log(`• Latency:       ${res.latencyMs}ms`);
        console.log(`• Message ID:    ${res.messageId || 'N/A'}`);
        console.log('\n📄 RENDERED EMAIL BODY (What was mailed):');
        console.log('----------------------------------------------------');
        console.log(res.textBody || res.htmlBody?.replace(/<[^>]*>?/gm, ''));
        console.log('----------------------------------------------------');
      });
    } else {
      console.log('  Trigger Results:', JSON.stringify(triggerData));
    }

    console.log('\n================================================================');
    console.log('🎉 LIVE TEST DISPATCH FINISHED SUCCESSFULLY');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Request error:', err.message);
  }
}

testLiveOutreach();
