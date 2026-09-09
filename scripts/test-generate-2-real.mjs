async function testDirectGeneration() {
  console.log('================================================================');
  console.log('🧪 AI EMAIL GENERATION FOR 2 REAL-WORLD LEADS (FROM DATA.XLSX)');
  console.log('================================================================\n');

  const lead1 = {
    id: 'lead-1',
    name: '', // company only -> triggers smart team salutation
    company: 'Arth Technology',
    email: 'hr@arthtechnology.com, contact@arthtechnology.com, info@arthtechnology.com',
    catName: 'Software & Web Development Solutions',
    website: 'https://arthtechnology.com/',
    address: 'Vadodara, Gujarat, India',
    status: 'valid',
  };

  const lead2 = {
    id: 'lead-2',
    name: '', // company only -> triggers smart team salutation
    company: 'Novumlogic Technologies Pvt Ltd',
    email: 'careers@novumlogic.com, hr@novumlogic.com, info@novumlogic.com',
    catName: 'Product Engineering & Software Development',
    website: 'https://www.novumlogic.com/',
    address: 'Vadodara, Gujarat, India',
    status: 'valid',
  };

  console.log('1️⃣ Generating for Lead #1 (Arth Technology)...');
  const res1 = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: lead1 }),
  });
  const data1 = await res1.json();

  console.log(`• Subject:       "${data1.subject}"`);
  console.log(`• Model Used:    ${data1.modelUsed}`);
  console.log(`• Unified To:    ${lead1.email}`);
  console.log('\n📄 Rendered Body:');
  console.log('----------------------------------------------------');
  console.log(data1.textBody || data1.htmlBody?.replace(/<[^>]*>?/gm, ''));
  console.log('----------------------------------------------------');
  console.log(`Word count: ${(data1.textBody || '').trim().split(/\s+/).length} words\n`);

  console.log('================================================================\n');
  console.log('2️⃣ Generating for Lead #2 (Novumlogic Technologies)...');
  const res2 = await fetch('http://localhost:3000/api/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: lead2 }),
  });
  const data2 = await res2.json();

  console.log(`• Subject:       "${data2.subject}"`);
  console.log(`• Model Used:    ${data2.modelUsed}`);
  console.log(`• Unified To:    ${lead2.email}`);
  console.log('\n📄 Rendered Body:');
  console.log('----------------------------------------------------');
  console.log(data2.textBody || data2.htmlBody?.replace(/<[^>]*>?/gm, ''));
  console.log('----------------------------------------------------');
  console.log(`Word count: ${(data2.textBody || '').trim().split(/\s+/).length} words\n`);

  console.log('================================================================');
  console.log('🎉 GENERATION FINISHED SUCCESSFULLY');
  console.log('================================================================');
}

testDirectGeneration().catch(console.error);
