-- Add forceVirtualGreenScreen field to Agreement table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agreement' 
        AND column_name = 'forceVirtualGreenScreen'
    ) THEN
        ALTER TABLE "Agreement" ADD COLUMN "forceVirtualGreenScreen" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

