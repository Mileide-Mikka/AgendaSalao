-- CreateTable
CREATE TABLE "business_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Belle Salão & Barbearia',
    "address" TEXT NOT NULL DEFAULT '',
    "open_time" TEXT NOT NULL DEFAULT '09:00',
    "close_time" TEXT NOT NULL DEFAULT '19:00',
    "whatsapp_reminder" BOOLEAN NOT NULL DEFAULT true,
    "cancel_alerts" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "business_settings" ("id", "name", "address", "open_time", "close_time", "whatsapp_reminder", "cancel_alerts", "updated_at")
VALUES ('default', 'Belle Salão & Barbearia', '', '09:00', '19:00', true, false, CURRENT_TIMESTAMP);
