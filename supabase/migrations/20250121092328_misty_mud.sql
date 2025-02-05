/*
  # Add public access policy for storage files

  1. Changes
    - Add policy to allow public (unauthenticated) access to storage files of public documents
  
  2. Security
    - Only allows reading storage files that are linked to public documents
    - No write access for unauthenticated users
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can read public document files" ON storage.objects;

-- Create policy for public access to storage files
CREATE POLICY "Public can read public document files"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = 'markdown-files'
    AND EXISTS (
      SELECT 1 
      FROM markdown_documents 
      WHERE storage_path = name 
      AND is_public = true
    )
  );