-- DropIndex
DROP INDEX "classes_start_at_idx";

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "therapist_id" UUID;

-- CreateIndex
CREATE INDEX "classes_therapist_id_start_at_idx" ON "classes"("therapist_id", "start_at");
