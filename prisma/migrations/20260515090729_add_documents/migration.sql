-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('therapist_file', 'client_file');

-- CreateEnum
CREATE TYPE "DocumentSharePermission" AS ENUM ('view', 'download', 'edit');

-- CreateTable
CREATE TABLE "therapist_clients" (
    "id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapist_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "document_kind" "DocumentKind" NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "shared_with" UUID NOT NULL,
    "shared_by" UUID NOT NULL,
    "permission" "DocumentSharePermission" NOT NULL,
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "therapist_clients_therapist_id_idx" ON "therapist_clients"("therapist_id");

-- CreateIndex
CREATE INDEX "therapist_clients_client_id_idx" ON "therapist_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_clients_therapist_id_client_id_key" ON "therapist_clients"("therapist_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_path_key" ON "documents"("storage_path");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_created_at_idx" ON "documents"("uploaded_by", "created_at");

-- CreateIndex
CREATE INDEX "documents_document_kind_uploaded_by_idx" ON "documents"("document_kind", "uploaded_by");

-- CreateIndex
CREATE INDEX "document_shares_shared_with_idx" ON "document_shares"("shared_with");

-- CreateIndex
CREATE INDEX "document_shares_shared_by_idx" ON "document_shares"("shared_by");

-- CreateIndex
CREATE UNIQUE INDEX "document_shares_document_id_shared_with_key" ON "document_shares"("document_id", "shared_with");

-- AddForeignKey
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
