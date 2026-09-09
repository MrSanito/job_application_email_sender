import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test5050Prompt() {
  const lead = {
    id: 'lead-test-1',
    name: 'Sarah Connor',
    email: 'hiring@solobuildai.com',
    company: 'Solobuild AI Innovations',
    catName: 'Full-Stack Developer',
    website: 'solobuildai.com',
    address: 'San Francisco, CA',
  };

  console.log('Testing 50% Anchor / 50% Context-Driven Rephrasing with Mistral + Tavily...');
  const res = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });

  const data = await res.json();
  console.log('\n--- Status:', res.status, 'Success:', data.success);
  console.log('Model Used:', data.modelUsed);
  console.log('Latency:', data.latencyMs, 'ms');
  console.log('Subject:', data.subject);
  console.log('\n--- Generated Email Body ---');
  console.log(data.textBody);
  console.log('\n--- Company Web Intelligence Context (Tavily) ---');
  console.log(data.companyContext?.slice(0, 300));
}

test5050Prompt();
