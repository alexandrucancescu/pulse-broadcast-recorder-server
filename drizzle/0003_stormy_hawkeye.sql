ALTER TABLE "recording" ADD COLUMN "format" VARCHAR;
UPDATE "recording" SET "format" = 'aac' WHERE "format" IS NULL;
ALTER TABLE "recording" ALTER COLUMN "format" SET NOT NULL;