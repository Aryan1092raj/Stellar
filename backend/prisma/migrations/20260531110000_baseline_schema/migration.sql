CREATE TABLE IF NOT EXISTS "Donation" (
  "id" SERIAL PRIMARY KEY,
  "donor_public_key" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "ngo_id" INTEGER NOT NULL,
  "project_id" INTEGER,
  "donor_lat" DOUBLE PRECISION NOT NULL,
  "donor_lng" DOUBLE PRECISION NOT NULL,
  "recipient_lat" DOUBLE PRECISION,
  "recipient_lng" DOUBLE PRECISION,
  "status" TEXT NOT NULL,
  "chain_create_tx" TEXT,
  "chain_verify_tx" TEXT,
  "soroban_contract_id" TEXT,
  "evidence_url" TEXT,
  "tx_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NGO" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "wallet_address" TEXT NOT NULL,
  "verification_status" TEXT NOT NULL,
  "sector" TEXT,
  "impact_metrics" JSONB,
  "locations" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Project" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ngo_id" INTEGER NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "googleUid" TEXT,
  "avatar" TEXT,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleUid_key" ON "User"("googleUid");
