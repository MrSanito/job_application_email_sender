import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testLinear() {
  const lead = {
    id: 'lead-test-2',
    name: 'Karri Saarinen',
    email: 'hiring@linear.app',
    company: 'Linear',
    catName: 'Software Engineering',
    website: 'linear.app',
    address: 'San Francisco, CA',
  };

  console.log('Testing 50/50 rephrasing for Linear with Mistral + Tavily...');
  const res = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });

  const data = await res.json();
  console.log('\n--- Status:', res.status, 'Success:', data.success);
  console.log('Model Used:', data.modelUsed);
  console.log('Subject:', data.subject);
  console.log('\n--- Generated Email Body ---');
  console.log(data.textBody);
}

testLinear();
