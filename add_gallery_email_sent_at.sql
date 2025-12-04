-- Add galleryEmailSentAt field to Agreement table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agreement' 
        AND column_name = 'galleryEmailSentAt'
    ) THEN
        ALTER TABLE "Agreement" ADD COLUMN "galleryEmailSentAt" TIMESTAMP(3);
    END IF;
END $$;

