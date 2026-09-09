import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testRoute() {
  const lead = {
    id: 'lead-test-1',
    name: 'Sarah Connor',
    email: 'hiring@linear.app',
    company: 'Linear',
    catName: 'Software Engineering',
    website: 'linear.app',
    address: 'San Francisco, CA',
  };

  try {
    const res = await fetch('http://localhost:3000/api/ai/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
    });

    const data = await res.json();
    console.log('Status code:', res.status);
    console.log('Success:', data.success);
    console.log('Model used:', data.modelUsed);
    console.log('Subject:', data.subject);
    console.log('Company Context:', data.companyContext?.slice(0, 150));
    console.log('\nText Body:\n', data.textBody);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testRoute();
