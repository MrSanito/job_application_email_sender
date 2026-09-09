import { ROTATING_SUBJECT_TEMPLATES, getRandomSubjectTemplate, getRandomRenderedSubject } from '../lib/template-engine.js';

console.log('=== 10 ROTATING SUBJECT LINE TEMPLATES ===');
ROTATING_SUBJECT_TEMPLATES.forEach((tpl, i) => {
  console.log(`${i + 1}. ${tpl}`);
});

console.log('\n=== TESTING RUNTIME ROTATION WITH Math.random() (10 SAMPLE RUNS) ===');
const sampleLead = {
  name: 'Sarah Connor',
  company: 'Cyberdyne Systems',
  catName: 'AI Systems Architect'
};

const counts = {};
for (let i = 0; i < 20; i++) {
  const subject = getRandomRenderedSubject(sampleLead);
  counts[subject] = (counts[subject] || 0) + 1;
  if (i < 10) {
    console.log(`Run #${i + 1}: "${subject}"`);
  }
}

console.log('\nDistribution across 20 iterations:', Object.keys(counts).length, 'distinct subject variations selected.');
