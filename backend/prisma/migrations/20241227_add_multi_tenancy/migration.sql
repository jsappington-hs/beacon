-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Add organizationId columns (nullable first for existing data)
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ReviewCycle" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Goal" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "GoalTemplate" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Integration" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;

-- Create default organization for existing data
INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('default-org', 'Default Organization', 'default', NOW());

-- Update all existing records to use default organization
UPDATE "User" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "Department" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "ReviewCycle" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "Goal" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "GoalTemplate" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "SystemSettings" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "Integration" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
UPDATE "AuditLog" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;

-- Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalTemplate" ADD CONSTRAINT "GoalTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraints and add new ones with organizationId
DROP INDEX IF EXISTS "SystemSettings_category_key";
CREATE UNIQUE INDEX "SystemSettings_organizationId_category_key" ON "SystemSettings"("organizationId", "category");

DROP INDEX IF EXISTS "Integration_type_key";
CREATE UNIQUE INDEX "Integration_organizationId_type_key" ON "Integration"("organizationId", "type");

-- Add index for AuditLog organizationId
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
