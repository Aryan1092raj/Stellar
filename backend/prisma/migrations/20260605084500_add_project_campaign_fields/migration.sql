ALTER TABLE "Project"
ADD COLUMN "target_amount" DOUBLE PRECISION,
ADD COLUMN "sector" TEXT,
ADD COLUMN "cover_image_url" TEXT,
ADD COLUMN "deadline" TIMESTAMP(3);

CREATE INDEX "Project_ngo_id_idx" ON "Project"("ngo_id");
CREATE INDEX "Project_deadline_idx" ON "Project"("deadline");
