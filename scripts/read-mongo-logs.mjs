import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let mongoUri = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('MONGODB_URI=')) {
    mongoUri = trimmed.slice('MONGODB_URI='.length).trim();
  }
}

async function checkSavedLogs() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const logs = await db.collection('emaillogs').find().sort({ _id: -1 }).limit(2).toArray();
  
  console.log('================================================================');
  console.log('📄 LAST 2 EMAILS STORED IN MONGODB ATLAS (solobuildai_dev)');
  console.log('================================================================');

  logs.forEach((log, idx) => {
    console.log(`\n[EMAIL #${idx + 1}]`);
    console.log(`Recipient:  ${log.lead?.email} (${log.lead?.name} at ${log.lead?.company})`);
    console.log(`Status:     ${log.status}`);
    console.log(`Subject:    ${log.subject}`);
    console.log(`Sent At:    ${log.sentAt || log.scheduledTime}`);
    console.log(`\nRendered Body HTML:\n${log.bodyHtml}\n`);
    console.log('----------------------------------------------------------------');
  });

  await mongoose.disconnect();
}

checkSavedLogs();
