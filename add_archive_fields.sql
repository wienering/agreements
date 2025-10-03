-- Add archive fields to Agreement table
ALTER TABLE "Agreement" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agreement" ADD COLUMN "archivedAt" TIMESTAMP(3);
