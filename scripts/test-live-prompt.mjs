async function run() {
  const sampleLead = {
    id: 'lead-test',
    name: 'David',
    company: 'Linear',
    catName: 'Issue Tracking & Real-Time Sync Engines',
    website: 'linear.app',
    status: 'valid',
  };

  console.log('Testing /api/ai/generate-email with updated job-application prompt...\n');
  const res = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: sampleLead }),
  });

  const data = await res.json();
  console.log('Subject:', data.subject);
  console.log('Model Used:', data.modelUsed);
  console.log('\nRendered Text:');
  console.log('----------------------------------------------------');
  console.log(data.textBody || data.htmlBody?.replace(/<[^>]*>?/gm, ''));
  console.log('----------------------------------------------------');
  const words = (data.textBody || '').trim().split(/\s+/).length;
  console.log(`Word Count: ${words} words`);
}

run().catch(console.error);
