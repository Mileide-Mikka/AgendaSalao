-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Geral';
