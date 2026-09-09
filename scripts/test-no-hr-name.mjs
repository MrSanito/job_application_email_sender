async function testNoHRName() {
  const leadWithoutHR = {
    id: 'lead-no-hr',
    name: '', // No HR name
    company: 'Supabase',
    catName: 'Open Source Postgres & Real-time Database Platform',
    website: 'supabase.com',
    status: 'valid',
  };

  console.log('Testing lead with ONLY company name (no HR name)...');
  const res = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: leadWithoutHR }),
  });

  const data = await res.json();
  console.log('Subject:', data.subject);
  console.log('\nRendered Text Body:');
  console.log('----------------------------------------------------');
  console.log(data.textBody || data.htmlBody?.replace(/<[^>]*>?/gm, ''));
  console.log('----------------------------------------------------');
}

testNoHRName().catch(console.error);
