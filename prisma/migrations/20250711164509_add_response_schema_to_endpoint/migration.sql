-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='endpoints' AND column_name='response_schema'
  ) THEN
    EXECUTE 'ALTER TABLE "endpoints" RENAME COLUMN response_schema TO "responseSchema"';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='endpoints' AND column_name='responseSchema'
  ) THEN
    EXECUTE 'ALTER TABLE "endpoints" ADD COLUMN "responseSchema" JSONB';
  END IF;
END$$;
