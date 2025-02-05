/*
  # Add get_document_by_id RPC function

  1. New Functions
    - `get_document_by_id`: Retrieves a document by ID bypassing RLS
      - Input: document_id (uuid)
      - Output: Single row from markdown_documents table
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Returns only necessary document fields
*/

CREATE OR REPLACE FUNCTION get_document_by_id(document_id uuid)
RETURNS TABLE (
  id uuid,
  alias text,
  file_name text,
  user_id uuid,
  storage_path text,
  created_at timestamptz,
  updated_at timestamptz,
  is_public boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.alias,
    d.file_name,
    d.user_id,
    d.storage_path,
    d.created_at,
    d.updated_at,
    d.is_public
  FROM markdown_documents d
  WHERE d.id = document_id;
END;
$$;