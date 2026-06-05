import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const input = path.resolve(process.argv[2] || 'datset.csv');
const output = path.resolve(process.argv[3] || 'frontend/public/data/curated-india-ngos.json');
const STELLAR_PUBLIC_KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeHeader(value) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function isCompleteCsvRecord(record) {
  let inQuotes = false;

  for (let index = 0; index < record.length; index += 1) {
    const char = record[index];
    const next = record[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
    }
  }

  return !inQuotes;
}

function records(csv) {
  const outputRecords = [];
  let record = '';

  for (const line of csv.split(/\r?\n/)) {
    record = record ? `${record}\n${line}` : line;
    if (!isCompleteCsvRecord(record)) continue;
    if (record.trim()) outputRecords.push(record);
    record = '';
  }

  if (record.trim()) throw new Error('CSV ended inside a quoted field');
  return outputRecords;
}

function placeholderWallet(seedText) {
  let seed = crypto.createHash('sha256').update(seedText).digest();
  let key = 'G';

  while (key.length < 56) {
    for (const byte of seed) {
      key += STELLAR_PUBLIC_KEY_ALPHABET[byte % STELLAR_PUBLIC_KEY_ALPHABET.length];
      if (key.length === 56) break;
    }
    seed = crypto.createHash('sha256').update(seed).digest();
  }

  return key;
}

function inferSector(text) {
  const value = text.toLowerCase();
  if (value.includes('education') || value.includes('school') || value.includes('student')) return 'Education';
  if (value.includes('health') || value.includes('medical') || value.includes('hospital')) return 'Health';
  if (value.includes('child') || value.includes('children')) return 'Child Welfare';
  if (value.includes('women') || value.includes('woman')) return 'Women Empowerment';
  if (value.includes('environment') || value.includes('climate') || value.includes('wildlife')) return 'Environment';
  if (value.includes('water') || value.includes('sanitation')) return 'Water & Sanitation';
  if (value.includes('rural') || value.includes('village')) return 'Rural Development';
  return 'Nonprofit';
}

if (!fs.existsSync(input)) {
  throw new Error(`CSV not found: ${input}`);
}

const csv = fs.readFileSync(input, 'utf8');
const parsedRecords = records(csv);
const headers = parseCsvLine(parsedRecords[0]).map(normalizeHeader);
const rows = parsedRecords.slice(1);

const ngos = rows.map((record, index) => {
  const values = parseCsvLine(record);
  const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] || '']));
  const name = row.organization || row.organisation || row.ngo_name || row.name;
  const sourceId = row.link || row.url || row.unique_id || name;
  const description = row.clean_description || row.description || '';

  return {
    id: index + 1,
    name,
    wallet_address: placeholderWallet(sourceId || name),
    verification_status: 'pending',
    sector: inferSector(description || name),
    source: 'curated-india-ngos',
    source_id: sourceId,
    city: null,
    district: null,
    state: null,
    registration_number: null,
    type_of_ngo: null,
  };
}).filter((ngo) => ngo.name);

fs.writeFileSync(output, `${JSON.stringify(ngos, null, 2)}\n`);
console.log(`Generated ${ngos.length} NGOs at ${output}`);
