-- AlterTable
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone_is_whatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prefers_message_contact" BOOLEAN NOT NULL DEFAULT false;
