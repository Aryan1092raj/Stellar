import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createHash } from 'crypto';
import { prisma } from '../db';

type CsvRow = Record<string, string>;

type ImportOptions = {
  file: string;
  limit?: number;
  status: 'pending' | 'verified';
  source: string;
  dryRun: boolean;
};

const STELLAR_PUBLIC_KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const aliases = {
  sourceId: ['unique_id', 'darpan_id', 'ngo_darpan_id', 'ngo_unique_id', 'id', 'link', 'url'],
  name: ['ngo_name', 'name', 'name_of_ngo', 'organization_name', 'organisation_name', 'organization', 'organisation'],
  email: ['ngo_email', 'email', 'email_id'],
  city: ['city_of_registration', 'city', 'registration_city'],
  district: ['district', 'district_of_registration'],
  state: ['state_of_registration', 'state', 'registration_state'],
  sector: ['field_of_work', 'sector', 'sectors', 'major_activities'],
  description: ['clean_description', 'description', 'about'],
  registrationNumber: ['registration_number', 'reg_no', 'registration_no'],
  typeOfNgo: ['type_of_ngo', 'ngo_type', 'type'],
  dataAsOn: ['data_as_on', 'as_on'],
  dateOfRegistration: ['date_of_registration', 'registration_date'],
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeValue(value?: string) {
  const normalized = (value || '').trim();
  return normalized || undefined;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
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

function isCompleteCsvRecord(record: string) {
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

async function* csvRecords(lines: readline.Interface) {
  let record = '';

  for await (const line of lines) {
    record = record ? `${record}\n${line}` : line;

    if (!isCompleteCsvRecord(record)) {
      continue;
    }

    yield record;
    record = '';
  }

  if (record.trim()) {
    throw new Error('CSV ended inside a quoted field');
  }
}

function rowValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = normalizeValue(row[key]);
    if (value) return value;
  }

  return undefined;
}

function placeholderWallet(seedText: string) {
  let seed = createHash('sha256').update(seedText).digest();
  let key = 'G';

  while (key.length < 56) {
    for (const byte of seed) {
      key += STELLAR_PUBLIC_KEY_ALPHABET[byte % STELLAR_PUBLIC_KEY_ALPHABET.length];
      if (key.length === 56) break;
    }
    seed = createHash('sha256').update(seed).digest();
  }

  return key;
}

function parseArgs(argv: string[]): ImportOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true');
    if (inlineValue === undefined && next && !next.startsWith('--')) index += 1;
    args.set(rawKey, value);
  }

  const file = args.get('file') || process.env.NGO_IMPORT_FILE;
  if (!file) {
    throw new Error('Missing --file path/to/ngo-darpan.csv or NGO_IMPORT_FILE');
  }

  const status = (args.get('status') || process.env.NGO_IMPORT_DEFAULT_STATUS || 'pending').toLowerCase();
  if (status !== 'pending' && status !== 'verified') {
    throw new Error('--status must be pending or verified');
  }

  const limitValue = args.get('limit') || process.env.NGO_IMPORT_LIMIT;
  const limit = limitValue ? Number(limitValue) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error('--limit must be a positive integer');
  }

  return {
    file: path.resolve(file),
    limit,
    status,
    source: args.get('source') || process.env.NGO_IMPORT_SOURCE || 'ngo-darpan',
    dryRun: args.has('dry-run') || process.env.NGO_IMPORT_DRY_RUN === '1',
  };
}

async function uniqueNameForSource(name: string, sourceId?: string) {
  const existing = await prisma.nGO.findUnique({ where: { name } });
  if (!existing || existing.source_id === sourceId) return name;
  if (!sourceId) return name;

  return `${name} (${sourceId})`;
}

async function importRow(row: CsvRow, status: 'pending' | 'verified', source: string) {
  const sourceId = rowValue(row, aliases.sourceId);
  const rawName = rowValue(row, aliases.name);
  if (!rawName) return 'skipped' as const;

  const name = await uniqueNameForSource(rawName, sourceId);
  const email = rowValue(row, aliases.email);
  const city = rowValue(row, aliases.city);
  const district = rowValue(row, aliases.district);
  const state = rowValue(row, aliases.state);
  const sector = rowValue(row, aliases.sector);
  const description = rowValue(row, aliases.description);
  const registrationNumber = rowValue(row, aliases.registrationNumber);
  const typeOfNgo = rowValue(row, aliases.typeOfNgo);
  const dataAsOn = rowValue(row, aliases.dataAsOn);
  const dateOfRegistration = rowValue(row, aliases.dateOfRegistration);

  const data = {
    name,
    wallet_address: placeholderWallet(sourceId || `${source}:${name}`),
    verification_status: status,
    sector,
    source,
    source_id: sourceId,
    email,
    state,
    district,
    city,
    registration_number: registrationNumber,
    type_of_ngo: typeOfNgo,
    locations: {
      country: 'India',
      state,
      district,
      city,
    },
    impact_metrics: {
      source,
      field_of_work: sector,
      description,
      registration_number: registrationNumber,
      type_of_ngo: typeOfNgo,
      data_as_on: dataAsOn,
      date_of_registration: dateOfRegistration,
    },
  };

  if (sourceId) {
    await prisma.nGO.upsert({
      where: { source_id: sourceId },
      update: data,
      create: data,
    });
    return 'upserted' as const;
  }

  await prisma.nGO.upsert({
    where: { name },
    update: data,
    create: data,
  });
  return 'upserted' as const;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.file)) {
    throw new Error(`CSV file not found: ${options.file}`);
  }

  const stream = fs.createReadStream(options.file);
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;
  let seen = 0;
  let imported = 0;
  let skipped = 0;
  const previewRows: Array<{ name?: string; sourceId?: string; sector?: string; descriptionLength: number }> = [];

  for await (const record of csvRecords(lines)) {
    if (!headers) {
      headers = parseCsvLine(record).map(normalizeHeader);
      continue;
    }

    if (!record.trim()) continue;
    if (options.limit && seen >= options.limit) break;

    const values = parseCsvLine(record);
    const row = headers.reduce<CsvRow>((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});

    seen += 1;
    if (options.dryRun) {
      const name = rowValue(row, aliases.name);
      if (!name) {
        skipped += 1;
      } else {
        imported += 1;
        if (previewRows.length < 5) {
          previewRows.push({
            name,
            sourceId: rowValue(row, aliases.sourceId),
            sector: rowValue(row, aliases.sector),
            descriptionLength: rowValue(row, aliases.description)?.length || 0,
          });
        }
      }
      continue;
    }

    const result = await importRow(row, options.status, options.source);
    if (result === 'skipped') skipped += 1;
    else imported += 1;

    if (seen % 1000 === 0) {
      console.log(`Processed ${seen} rows: imported=${imported}, skipped=${skipped}`);
    }
  }

  if (options.dryRun) {
    console.log(`Dry run complete: file=${options.file}, source=${options.source}, processed=${seen}, importable=${imported}, skipped=${skipped}`);
    console.log(`Headers: ${(headers || []).join(', ')}`);
    console.log(`Preview: ${JSON.stringify(previewRows, null, 2)}`);
    return;
  }

  console.log(`Indian NGO import complete: file=${options.file}, source=${options.source}, processed=${seen}, imported=${imported}, skipped=${skipped}, status=${options.status}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
