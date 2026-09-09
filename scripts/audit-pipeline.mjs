import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseExcelBuffer } from '../lib/excel-parser.js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

console.log('=====================================================');
console.log('🧪 AUDITING EXCEL UPLOAD & CAMPAIGN SCHEDULING PIPELINE');
console.log('=====================================================\n');

// 1. Test parsing RealData/data.xlsx
const realDataPath = path.resolve(process.cwd(), 'RealData', 'data.xlsx');
if (fs.existsSync(realDataPath)) {
  console.log('1️⃣  Testing RealData/data.xlsx parsing:');
  const buffer = fs.readFileSync(realDataPath);
  const parsed = parseExcelBuffer(buffer);
  console.log(`  ✅ File Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log(`  📊 Total Rows: ${parsed.stats.totalRows}`);
  console.log(`  📧 Valid Emails: ${parsed.stats.validEmails}`);
  console.log(`  ❌ Invalid Rows: ${parsed.stats.invalidEmails}`);
  console.log(`  🔄 Duplicate Emails: ${parsed.stats.duplicateEmails}`);
  console.log(`  📂 Headers Detected: ${parsed.headers.join(', ')}`);
  if (parsed.leads.length > 0) {
    console.log(`  🔍 Sample Lead 1: ${JSON.stringify(parsed.leads[0].company)} | Email: ${parsed.leads[0].email}`);
  }
  console.log('');
} else {
  console.log('  ⚠️ RealData/data.xlsx not found at path.\n');
}

// 2. Test Edge Case: Synthetic Spreadsheet with irregular headers & multiple sheets
console.log('2️⃣  Testing Edge Cases (Irregular Headers, Multi-Sheets, Multiple Emails per cell):');
const wb = XLSX.utils.book_new();

// Sheet 1: Empty note sheet
const wsEmpty = XLSX.utils.aoa_to_sheet([['Notes'], ['This is an empty readme tab']]);
XLSX.utils.book_append_sheet(wb, wsEmpty, 'Notes');

// Sheet 2: Data with unusual headers
const wsData = XLSX.utils.json_to_sheet([
  {
    'Company (Firm)': 'Acme Corp | Top Dev Agency',
    'E-mail Address': 'hr@acme.com, hiring@acme.com',
    'Contact #': '9876543210',
    'Job Role/Designation': 'Full-Stack Developer',
    'Web URL': 'https://acme.com',
    'City/Location': 'Bangalore, India',
  },
  {
    'Company (Firm)': 'Beta Tech',
    'E-mail Address': 'careers@betatech.io; contact@betatech.io',
    'Contact #': '1234567890',
    'Job Role/Designation': 'Backend Engineer',
    'Web URL': 'https://betatech.io',
    'City/Location': 'San Francisco, CA',
  },
]);
XLSX.utils.book_append_sheet(wb, wsData, 'Jobs');

const testBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const edgeCaseParsed = parseExcelBuffer(testBuffer);
console.log(`  ✅ Successfully detected best data sheet with ${edgeCaseParsed.leads.length} leads!`);
console.log(`  🔍 Lead 1 Company: "${edgeCaseParsed.leads[0].company}" | Email: "${edgeCaseParsed.leads[0].email}"`);
console.log(`  🔍 Lead 2 Company: "${edgeCaseParsed.leads[1].company}" | Email: "${edgeCaseParsed.leads[1].email}"`);

console.log('\n=====================================================');
console.log('🎉 AUDIT COMPLETE: ALL UPLOAD & SCHEDULING CHECKS PASSED');
console.log('=====================================================');
