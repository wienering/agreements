-- Add business intelligence features to the database
-- Run this SQL script in your database to add the new fields and models

-- Add new fields to Template table
ALTER TABLE "Template" ADD COLUMN "lastModifiedBy" TEXT;
ALTER TABLE "Template" ADD COLUMN "changeSummary" TEXT;
ALTER TABLE "Template" ADD COLUMN "isActive" BOOLEAN DEFAULT true;

-- Add new fields to Agreement table
ALTER TABLE "Agreement" ADD COLUMN "packagePrice" DECIMAL(10,2);
ALTER TABLE "Agreement" ADD COLUMN "estimatedRevenue" DECIMAL(10,2);
ALTER TABLE "Agreement" ADD COLUMN "firstViewedAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN "lastViewedAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN "viewCount" INTEGER DEFAULT 0;

-- Create TemplateVersion table
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "changeSummary" TEXT,
    "modifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- Create ClientRetention table
CREATE TABLE "ClientRetention" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalBookings" INTEGER NOT NULL DEFAULT 1,
    "firstBookingAt" TIMESTAMP(3) NOT NULL,
    "lastBookingAt" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "averageRevenue" DECIMAL(10,2) NOT NULL,
    "isRepeatClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientRetention_pkey" PRIMARY KEY ("id")
);

-- Create AgreementView table
CREATE TABLE "AgreementView" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    CONSTRAINT "AgreementView_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClientRetention" ADD CONSTRAINT "ClientRetention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgreementView" ADD CONSTRAINT "AgreementView_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint for ClientRetention
ALTER TABLE "ClientRetention" ADD CONSTRAINT "ClientRetention_clientId_key" UNIQUE ("clientId");

-- Create indexes for better performance
CREATE INDEX "TemplateVersion_templateId_idx" ON "TemplateVersion"("templateId");
CREATE INDEX "ClientRetention_clientId_idx" ON "ClientRetention"("clientId");
CREATE INDEX "AgreementView_agreementId_idx" ON "AgreementView"("agreementId");
CREATE INDEX "AgreementView_viewedAt_idx" ON "AgreementView"("viewedAt");

-- Update existing templates to have default values
UPDATE "Template" SET "isActive" = true WHERE "isActive" IS NULL;
