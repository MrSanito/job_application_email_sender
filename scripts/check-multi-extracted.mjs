import fs from 'fs';
import path from 'path';
import { parseExcelBuffer } from '../lib/excel-parser.js';

const buffer = fs.readFileSync(path.resolve('public/data.xlsx'));
const parsed = parseExcelBuffer(buffer);

console.log('Parsed Stats:', parsed.stats);

const multiLeads = parsed.leads.filter(l => l.email.includes(','));
console.log(`\nFound ${multiLeads.length} leads with MULTIPLE comma-separated emails:`);
console.log('Sample Lead 1:', multiLeads[0]);
console.log('Sample Lead 2:', multiLeads[1]);
