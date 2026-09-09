import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const buffer = fs.readFileSync(path.resolve('public/data.xlsx'));
const workbook = XLSX.read(buffer, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Jobs'], { defval: '' });

console.log('Total rows:', rows.length);
console.log('Sample row with hiring_professional_email:');
console.log(rows[0]);
