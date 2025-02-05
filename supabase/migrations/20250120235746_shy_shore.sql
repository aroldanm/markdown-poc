/*
  # Update alias column to allow null values

  1. Changes
    - Modify `alias` column in `markdown_documents` table to allow NULL values
    - This allows documents to be created without an alias, falling back to file_name for display
*/

-- Allow null values for alias column
ALTER TABLE markdown_documents ALTER COLUMN alias DROP NOT NULL;