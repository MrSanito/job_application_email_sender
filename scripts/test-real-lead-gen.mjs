async function testRealLeadGen() {
  const lead = {
    id: 'lead-1',
    name: '',
    email: 'hr@dsuinfotech.com',
    company: 'DSU INFOTECH',
    catName: 'Software company',
    website: 'https://dsuinfotech.com/',
    address: 'Vadodara, Gujarat, India',
    status: 'valid',
  };

  console.log('Testing AI email generation on Lead #1 from data.xlsx (DSU INFOTECH)...\n');
  const res = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });

  const data = await res.json();
  console.log('Subject:', data.subject);
  console.log('\nEmail Body:');
  console.log('----------------------------------------------------');
  console.log(data.textBody || data.htmlBody?.replace(/<[^>]*>?/gm, ''));
  console.log('----------------------------------------------------');
}

testRealLeadGen().catch(console.error);
