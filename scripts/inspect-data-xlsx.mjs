import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('public/data.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('=====================================================');
console.log('📊 EXCEL INSPECTION REPORT: data.xlsx');
console.log('=====================================================\n');

console.log('📄 Sheet Names:', workbook.SheetNames);

const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log(`\nTotal Rows Found: ${rawData.length}`);

if (rawData.length > 0) {
  console.log('\nDetected Columns/Headers:');
  const headers = Object.keys(rawData[0]);
  headers.forEach((h, i) => console.log(`  ${i + 1}. "${h}"`));

  console.log('\n--- First 3 Sample Rows ---');
  console.log(JSON.stringify(rawData.slice(0, 3), null, 2));

  // Email column analysis
  let validEmails = 0;
  let emptyEmails = 0;
  let domainsAvailable = 0;
  const emailsSet = new Set();
  let duplicates = 0;

  rawData.forEach((row) => {
    // Find possible email in row
    let email = '';
    for (const [k, v] of Object.entries(row)) {
      const kLower = k.toLowerCase();
      const valStr = String(v).trim();
      if ((kLower.includes('email') || kLower.includes('mail')) && valStr.includes('@')) {
        email = valStr;
        break;
      }
      if (!email && valStr.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
        email = valStr;
      }
    }

    // Check website/domain
    let website = '';
    for (const [k, v] of Object.entries(row)) {
      const kLower = k.toLowerCase();
      const valStr = String(v).trim();
      if (kLower.includes('web') || kLower.includes('domain') || kLower.includes('url') || valStr.startsWith('http') || valStr.includes('.com') || valStr.includes('.io')) {
        website = valStr;
        break;
      }
    }

    if (email) {
      if (emailsSet.has(email.toLowerCase())) {
        duplicates++;
      } else {
        emailsSet.add(email.toLowerCase());
        validEmails++;
      }
    } else {
      emptyEmails++;
    }

    if (website) {
      domainsAvailable++;
    }
  });

  console.log('\n--- Data Quality Summary ---');
  console.log(`• Total Rows:               ${rawData.length}`);
  console.log(`• Rows with Direct Email:   ${validEmails}`);
  console.log(`• Duplicates:               ${duplicates}`);
  console.log(`• Rows without Direct Email:${emptyEmails}`);
  console.log(`• Rows with Website/Domain: ${domainsAvailable}`);
}

console.log('\n=====================================================');
