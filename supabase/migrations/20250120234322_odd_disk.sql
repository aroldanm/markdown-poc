/*
  # Update document schema
  
  1. Changes
    - Add alias column if it doesn't exist
    - Copy data from title to alias if title exists
    - Drop title column if it exists
    - Drop file_name column if it exists
  
  2. Notes
    - Uses safe DDL operations with IF EXISTS/IF NOT EXISTS
    - Preserves existing data during column rename
*/

-- First add the new alias column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'markdown_documents' AND column_name = 'alias'
  ) THEN
    ALTER TABLE markdown_documents ADD COLUMN alias text;
  END IF;
END $$;

-- Copy data from title to alias if title exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'markdown_documents' AND column_name = 'title'
  ) THEN
    UPDATE markdown_documents SET alias = title WHERE alias IS NULL;
    ALTER TABLE markdown_documents DROP COLUMN title;
  END IF;
END $$;

-- Make alias NOT NULL after data migration
ALTER TABLE markdown_documents ALTER COLUMN alias SET NOT NULL;

-- Drop file_name if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'markdown_documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE markdown_documents DROP COLUMN file_name;
  END IF;
END $$;