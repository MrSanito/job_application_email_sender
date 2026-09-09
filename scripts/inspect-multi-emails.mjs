import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const buffer = fs.readFileSync(path.resolve('public/data.xlsx'));
const workbook = XLSX.read(buffer, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Jobs'], { defval: '' });

console.log('Searching for rows with multiple emails in data.xlsx...\n');

let multiEmailRows = [];
rows.forEach((row, i) => {
  const hiring = String(row.hiring_professional_email || '');
  const emailCol = String(row.email || '');
  
  if (hiring.includes(',') || hiring.includes(';') || hiring.includes('/') || hiring.includes(' ') || (hiring.match(/@/g) || []).length > 1) {
    multiEmailRows.push({ rowIdx: i + 1, company: row.name, hiring_professional_email: hiring });
  }
});

console.log(`Found ${multiEmailRows.length} rows with multiple emails:`);
console.log(JSON.stringify(multiEmailRows.slice(0, 10), null, 2));

console.log('\n--- First 2 rows from data.xlsx ---');
console.log(rows.slice(0, 2));
