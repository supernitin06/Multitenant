-- Brings an older database up to the current Prisma schema for the education
-- models WITHOUT dropping anything (`prisma db push` would drop the classes /
-- libraries / books / attendances tables and student columns that other
-- branches still use). Safe to run more than once.
--
-- Run: npx prisma db execute --file prisma/scripts/add-missing-education-columns.sql --url "$DIRECT_DATABASE_URL"

ALTER TABLE "students"       ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "students"       ADD COLUMN IF NOT EXISTS "sectionId"    TEXT;
ALTER TABLE "teachers"       ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "examinations"   ADD COLUMN IF NOT EXISTS "isActive"     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "exam_schedules" ADD COLUMN IF NOT EXISTS "className"    TEXT;

-- Keep existing student photos (older schema stored them in "profilePictureUrl")
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'students' AND column_name = 'profilePictureUrl') THEN
    UPDATE "students" SET "profileImage" = "profilePictureUrl"
    WHERE "profileImage" IS NULL AND "profilePictureUrl" IS NOT NULL;
  END IF;
END $$;
