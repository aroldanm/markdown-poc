/*
  # Create markdown documents table

  1. New Tables
    - `markdown_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `file_name` (text)
      - `content` (text)
      - `is_public` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `markdown_documents` table
    - Add policies for:
      - Users can CRUD their own documents
      - Anyone can read public documents
*/

-- Create markdown documents table
CREATE TABLE IF NOT EXISTS markdown_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE markdown_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own documents
CREATE POLICY "Users can read own documents"
  ON markdown_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can read public documents
CREATE POLICY "Anyone can read public documents"
  ON markdown_documents
  FOR SELECT
  USING (is_public = true);

-- Users can create their own documents
CREATE POLICY "Users can create own documents"
  ON markdown_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON markdown_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON markdown_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at on document changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_markdown_documents_updated_at
  BEFORE UPDATE ON markdown_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();