-- AlterEnum
ALTER TYPE "DocumentKind" ADD VALUE 'therapist_link';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "external_url" TEXT;
ALTER TABLE "documents" ADD COLUMN "link_provider" TEXT;
