import { config } from './env';
import { prisma } from '../db';

/**
 * Database connection configuration
 * Currently uses Prisma - can be extended for other ORMs
 */
export const getDatabaseConfig = () => {
  if (!config.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not configured. Using in-memory mock mode.');
    return { url: null, mock: true };
  }

  return {
    url: config.DATABASE_URL,
    mock: false,
  };
};

// TODO: Initialize Prisma client or database connection
export const initializeDatabase = async () => {
  const dbConfig = getDatabaseConfig();
  
  if (dbConfig.mock) {
    console.log('📦 Running in MOCK database mode');
    return { connected: false, mock: true };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    await ensureDevelopmentSchema();
    console.log('🗄️  Database connected successfully');
    return { connected: true, mock: false };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

async function ensureDevelopmentSchema() {
  if (config.NODE_ENV === 'production') return;

  const statements = [
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "source" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "source_id" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "email" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "state" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "district" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "city" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "registration_number" TEXT',
    'ALTER TABLE "NGO" ADD COLUMN IF NOT EXISTS "type_of_ngo" TEXT',
    'CREATE UNIQUE INDEX IF NOT EXISTS "NGO_source_id_key" ON "NGO"("source_id")',
    'CREATE INDEX IF NOT EXISTS "NGO_source_idx" ON "NGO"("source")',
    'CREATE INDEX IF NOT EXISTS "NGO_state_idx" ON "NGO"("state")',
    'CREATE INDEX IF NOT EXISTS "NGO_district_idx" ON "NGO"("district")',
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "target_amount" DOUBLE PRECISION',
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sector" TEXT',
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT',
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)',
    'CREATE INDEX IF NOT EXISTS "Project_ngo_id_idx" ON "Project"("ngo_id")',
    'CREATE INDEX IF NOT EXISTS "Project_deadline_idx" ON "Project"("deadline")',
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}
