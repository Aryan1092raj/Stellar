import { createHash } from 'crypto';
import { prisma } from '../db';

type SeedNGO = {
  name: string;
  sector: string;
};

const STELLAR_PUBLIC_KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const indianNGOs: SeedNGO[] = [
  { name: 'CRY - Child Rights and You', sector: 'Child Welfare' },
  { name: 'Pratham Education Foundation', sector: 'Education' },
  { name: 'Goonj', sector: 'Disaster Relief' },
  { name: 'HelpAge India', sector: 'Health' },
  { name: 'The Akshaya Patra Foundation', sector: 'Child Welfare' },
  { name: 'Teach For India', sector: 'Education' },
  { name: 'Magic Bus India Foundation', sector: 'Child Welfare' },
  { name: 'Project Nanhi Kali', sector: 'Education' },
  { name: 'iCall TISS', sector: 'Health' },
  { name: 'Smile Foundation', sector: 'Education' },
  { name: 'Udayan Care', sector: 'Child Welfare' },
  { name: 'CREA', sector: 'Women Empowerment' },
  { name: 'Barefoot College International', sector: 'Rural Development' },
  { name: 'Asha for Education', sector: 'Education' },
  { name: 'SEWA Bharat', sector: 'Women Empowerment' },
  { name: 'Disha Foundation', sector: 'Rural Development' },
  { name: 'Vidyasaarathi Foundation', sector: 'Education' },
  { name: 'Josh Talks Foundation', sector: 'Education' },
  { name: 'CARE India', sector: 'Disaster Relief' },
  { name: 'Bal Raksha Bharat', sector: 'Child Welfare' },
  { name: 'WaterAid India', sector: 'Health' },
  { name: 'Wildlife Trust of India', sector: 'Environment' },
  { name: 'Cuddles Foundation', sector: 'Health' },
  { name: 'SNEHA Mumbai', sector: 'Health' },
  { name: 'Foundation for Ecological Security', sector: 'Environment' },
];

function placeholderWallet(name: string) {
  let seed = createHash('sha256').update(name).digest();
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

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const ngo of indianNGOs) {
    const existing = await prisma.nGO.findUnique({ where: { name: ngo.name } });

    await prisma.nGO.upsert({
      where: { name: ngo.name },
      update: {
        sector: ngo.sector,
        verification_status: 'verified',
        source: 'curated-india',
      },
      create: {
        name: ngo.name,
        sector: ngo.sector,
        wallet_address: placeholderWallet(ngo.name),
        verification_status: 'verified',
        source: 'curated-india',
      },
    });

    if (existing) skipped += 1;
    else inserted += 1;
  }

  console.log(`Seeded Indian NGOs: inserted=${inserted}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
