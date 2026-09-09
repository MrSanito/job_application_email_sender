import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const buffer = fs.readFileSync(path.resolve('public/data.xlsx'));
const workbook = XLSX.read(buffer, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Jobs'], { defval: '' });

console.log('Row 5 from data.xlsx:');
console.log(rows[4]);

console.log('\nRow 6 from data.xlsx:');
console.log(rows[5]);
