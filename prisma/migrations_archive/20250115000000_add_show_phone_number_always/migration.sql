-- Add showPhoneNumberAlways field to Agreement table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agreement' 
        AND column_name = 'showPhoneNumberAlways'
    ) THEN
        ALTER TABLE "Agreement" ADD COLUMN "showPhoneNumberAlways" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

