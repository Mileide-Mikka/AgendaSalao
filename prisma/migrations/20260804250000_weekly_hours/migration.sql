-- Grade semanal editável por estabelecimento
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "weekly_hours" JSONB;

-- Seed a partir dos horários já salvos (dias de semana + sábado; domingo fechado)
UPDATE "business_settings"
SET "weekly_hours" = jsonb_build_object(
  'mon', jsonb_build_object('open', true, 'openTime', "open_time", 'closeTime', "close_time"),
  'tue', jsonb_build_object('open', true, 'openTime', "open_time", 'closeTime', "close_time"),
  'wed', jsonb_build_object('open', true, 'openTime', "open_time", 'closeTime', "close_time"),
  'thu', jsonb_build_object('open', true, 'openTime', "open_time", 'closeTime', "close_time"),
  'fri', jsonb_build_object('open', true, 'openTime', "open_time", 'closeTime', "close_time"),
  'sat', jsonb_build_object('open', true, 'openTime', "saturday_open_time", 'closeTime', "saturday_close_time"),
  'sun', jsonb_build_object('open', false, 'openTime', "open_time", 'closeTime', "close_time")
)
WHERE "weekly_hours" IS NULL;
