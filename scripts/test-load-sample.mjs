async function testLoadSample() {
  console.log('Testing /api/campaign/load-sample endpoint...');
  const res = await fetch('http://localhost:3000/api/campaign/load-sample');
  const data = await res.json();

  console.log('Status:', res.status);
  console.log('Stats:', data.stats);
  console.log('\nSample lead [0]:', data.leads?.[0]);
  console.log('Sample lead [1]:', data.leads?.[1]);
}

testLoadSample().catch(console.error);
