-- Backfill script: Copy template.htmlContent to customHtmlContent for existing agreements
-- This ensures all existing agreements have their own copy of the template content

UPDATE "Agreement"
SET "customHtmlContent" = (
  SELECT "htmlContent"
  FROM "Template"
  WHERE "Template"."id" = "Agreement"."templateId"
)
WHERE "customHtmlContent" IS NULL;

