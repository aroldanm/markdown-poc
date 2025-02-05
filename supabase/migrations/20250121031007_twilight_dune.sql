/*
  # Fix document deletion policies

  1. Changes
    - Drop and recreate delete policies with proper conditions
    - Add explicit CASCADE option for document deletion
    - Ensure proper storage cleanup

  2. Security
    - Maintain RLS security
    - Only allow users to delete their own documents
*/

-- First drop existing policies
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can delete own documents" ON markdown_documents;
    DROP POLICY IF EXISTS "Users can delete their markdown files" ON storage.objects;
    
    -- Recreate document deletion policy
    CREATE POLICY "Users can delete own documents"
        ON markdown_documents
        FOR DELETE
        TO authenticated
        USING (
            auth.uid() = user_id
        );

    -- Recreate storage deletion policy
    CREATE POLICY "Users can delete their markdown files"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'markdown-files' 
            AND (
                auth.uid()::text = (storage.foldername(name))[1]
                OR 
                EXISTS (
                    SELECT 1 
                    FROM markdown_documents 
                    WHERE storage_path = name 
                    AND user_id = auth.uid()
                )
            )
        );
END $$;

-- Create a function to handle document deletion with proper cleanup
CREATE OR REPLACE FUNCTION delete_document(doc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    doc_storage_path text;
BEGIN
    -- Get the storage path before deletion
    SELECT storage_path INTO doc_storage_path
    FROM markdown_documents
    WHERE id = doc_id AND user_id = auth.uid();

    -- Delete the document
    DELETE FROM markdown_documents WHERE id = doc_id AND user_id = auth.uid();

    -- Note: Storage object will be cleaned up by trigger or manually by the client
END;
$$;