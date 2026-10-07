-- Brings an older database up to the current Prisma schema for the education
-- models (students, teachers, examinations, date sheets, classes) WITHOUT
-- dropping anything. `prisma db push` would instead drop tables / columns that
-- other branches still use. Safe to run any number of times.
--
-- Run (from the Multitenant folder):
--   npm run db:sync-education
-- or against a specific database:
--   npx prisma db execute --file prisma/scripts/add-missing-education-columns.sql --url "<DATABASE_URL>"

-- 1. Classes table ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "academicYear" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "classes_tenantId_name_section_academicYear_key"
    ON "classes"("tenantId", "name", "section", "academicYear");

-- 2. Missing columns ------------------------------------------------------------
ALTER TABLE "students"       ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "students"       ADD COLUMN IF NOT EXISTS "sectionId"    TEXT;
ALTER TABLE "students"       ADD COLUMN IF NOT EXISTS "classId"      TEXT;
ALTER TABLE "teachers"       ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "examinations"   ADD COLUMN IF NOT EXISTS "isActive"     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "examinations"   ADD COLUMN IF NOT EXISTS "classId"      TEXT;
ALTER TABLE "exam_schedules" ADD COLUMN IF NOT EXISTS "className"    TEXT;
ALTER TABLE "exam_schedules" ADD COLUMN IF NOT EXISTS "classId"      TEXT;

-- Keep existing student photos (older schema stored them in "profilePictureUrl")
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'students' AND column_name = 'profilePictureUrl') THEN
    UPDATE "students" SET "profileImage" = "profilePictureUrl"
    WHERE "profileImage" IS NULL AND "profilePictureUrl" IS NOT NULL;
  END IF;
END $$;

-- 3. Foreign keys (only added when missing) -----------------------------------
-- Class ids that point to a class that does not exist would block the foreign
-- key, so they are cleared first.
UPDATE "students"       SET "classId" = NULL WHERE "classId" IS NOT NULL AND "classId" NOT IN (SELECT "id" FROM "classes");
UPDATE "examinations"   SET "classId" = NULL WHERE "classId" IS NOT NULL AND "classId" NOT IN (SELECT "id" FROM "classes");
UPDATE "exam_schedules" SET "classId" = NULL WHERE "classId" IS NOT NULL AND "classId" NOT IN (SELECT "id" FROM "classes");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_tenantId_fkey') THEN
    ALTER TABLE "classes" ADD CONSTRAINT "classes_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_classId_fkey') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'examinations_classId_fkey') THEN
    ALTER TABLE "examinations" ADD CONSTRAINT "examinations_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_schedules_classId_fkey') THEN
    ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
