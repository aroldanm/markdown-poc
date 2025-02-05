/*
  # Fix document deletion policies

  1. Changes
    - Drop existing delete policy if exists
    - Create new delete policy with proper conditions
    - Add delete policy for storage objects
*/

-- Drop existing delete policy if exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can delete own documents" ON markdown_documents;
    
    -- Recreate delete policy with proper conditions
    CREATE POLICY "Users can delete own documents"
        ON markdown_documents
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);

    -- Ensure storage policy exists and is correct
    DROP POLICY IF EXISTS "Users can delete their markdown files" ON storage.objects;
    
    CREATE POLICY "Users can delete their markdown files"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'markdown-files' 
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
END $$;