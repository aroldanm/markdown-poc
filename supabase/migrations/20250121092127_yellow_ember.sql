/*
  # Add public access policy for markdown documents

  1. Changes
    - Add policy to allow public (unauthenticated) access to public markdown documents
  
  2. Security
    - Only allows reading documents where is_public = true
    - No write access for unauthenticated users
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can read public documents" ON markdown_documents;

-- Create policy for public access
CREATE POLICY "Anyone can read public documents"
  ON markdown_documents
  FOR SELECT
  TO anon
  USING (is_public = true);