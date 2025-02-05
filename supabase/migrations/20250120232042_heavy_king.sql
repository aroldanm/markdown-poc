/*
  # Update markdown documents table to use Storage

  1. Changes
    - Remove content column from markdown_documents
    - Add storage_path column to store file location in Storage

  2. Security
    - Keep existing RLS policies
    - Add storage_path for file reference
*/

-- Remove content column and add storage_path
ALTER TABLE markdown_documents 
  DROP COLUMN IF EXISTS content,
  ADD COLUMN storage_path text NOT NULL;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('markdown-files', 'markdown-files')
ON CONFLICT DO NOTHING;

-- Enable RLS on storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies
CREATE POLICY "Users can upload markdown files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'markdown-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their markdown files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'markdown-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their markdown files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'markdown-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their markdown files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'markdown-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM markdown_documents
      WHERE storage_path = name
      AND is_public = true
    )
  ));