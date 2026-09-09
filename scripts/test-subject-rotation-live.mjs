import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifySubjectRotation() {
  console.log('Loading sample leads...');
  const sampleRes = await fetch('http://localhost:3000/api/campaign/load-sample');
  const sampleData = await sampleRes.json();
  
  if (!sampleData.success || !sampleData.leads || sampleData.leads.length === 0) {
    console.error('Failed to load sample leads:', sampleData);
    return;
  }

  const testLeads = sampleData.leads.slice(0, 15);
  console.log(`Loaded ${testLeads.length} leads. Creating test campaign to inspect runtime subject rotation...`);

  const createRes = await fetch('http://localhost:3000/api/campaign/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Subject Rotation Verification Campaign',
      leads: testLeads,
      config: {
        campaignName: 'Subject Rotation Verification Campaign',
        senderName: 'Vishal Nishad',
        senderEmail: 'vishalni2005@gmail.com',
        candidateName: 'Vishal Nishad',
        candidateRole: 'Full-Stack Developer',
        candidatePortfolio: 'https://github.com/MrSanito',
        emailsPerDay: 50,
        intervalSeconds: 60,
        batchesPerDay: 1,
        batchTimings: [{ batchNumber: 1, startTime: '09:00', endTime: '18:00' }],
      }
    })
  });

  const createData = await createRes.json();
  if (!createData.success) {
    console.error('Campaign creation failed:', createData);
    return;
  }

  console.log('\n=== RUNTIME SUBJECT LINES GENERATED ACROSS 15 LEADS ===');
  const subjects = createData.campaign.jobs.map((j) => j.subject);
  subjects.forEach((subj, idx) => {
    console.log(`Job #${idx + 1} (${createData.campaign.jobs[idx].lead.company}): "${subj}"`);
  });

  const uniqueSubjects = new Set(subjects);
  console.log(`\nUnique Subjects across 15 jobs: ${uniqueSubjects.size} distinct templates rotated via Math.random()!`);
}

verifySubjectRotation();
