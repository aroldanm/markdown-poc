/*
  # Add file_name column back
  
  1. Changes
    - Add file_name column back to markdown_documents table
    - Make it NOT NULL with a default value
  
  2. Notes
    - Uses safe DDL operations with IF EXISTS/IF NOT EXISTS
    - Preserves existing data
*/

-- Add file_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'markdown_documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE markdown_documents ADD COLUMN file_name text NOT NULL DEFAULT '';
  END IF;
END $$;