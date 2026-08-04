-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN "saturday_open_time" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "business_settings" ADD COLUMN "saturday_close_time" TEXT NOT NULL DEFAULT '20:00';
