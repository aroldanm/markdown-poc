import { supabase } from './supabase';
import type { MarkdownFile } from '../types';

const BUCKET_NAME = 'markdown-files';

export async function getDocuments() {
  const { data: documents, error } = await supabase
    .from('markdown_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const docs = await Promise.all(documents.map(async doc => {
    const content = await getFileContent(doc.storage_path);
    return {
      id: doc.id,
      title: doc.alias || doc.file_name, // Show alias if exists, otherwise show file_name
      fileName: doc.file_name,
      content,
      userId: doc.user_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      isPublic: doc.is_public
    };
  }));
  
  return docs;
}

export async function getDocument(id: string) {
  const { data: doc, error } = await supabase
    .from('markdown_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!doc) return null;

  const content = await getFileContent(doc.storage_path);

  return {
    id: doc.id,
    title: doc.alias || doc.file_name, // Show alias if exists, otherwise show file_name
    fileName: doc.file_name,
    content,
    userId: doc.user_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    isPublic: doc.is_public
  };
}

export async function createDocument(document: Omit<MarkdownFile, 'id' | 'createdAt' | 'updatedAt'>) {
  // Generate a UUID for the document
  const { data: { id: docId }, error: idError } = await supabase.rpc('generate_uuid');
  if (idError) throw idError;

  // Create the file name using the UUID
  const fileName = `${docId}.md`;
  const storagePath = `${document.userId}/${fileName}`;

  // Create database record with storage path
  const { data: doc, error: dbError } = await supabase
    .from('markdown_documents')
    .insert({
      id: docId,
      alias: document.title || null, // Allow null alias
      file_name: fileName, // Store the actual file name
      user_id: document.userId,
      is_public: document.isPublic,
      storage_path: storagePath
    })
    .select()
    .single();

  if (dbError) throw dbError;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, document.content);

  if (uploadError) {
    // Cleanup database record if storage upload fails
    await supabase.from('markdown_documents').delete().eq('id', docId);
    throw uploadError;
  }

  return {
    id: doc.id,
    title: doc.alias || doc.file_name, // Show alias if exists, otherwise show file_name
    fileName: doc.file_name,
    content: document.content,
    userId: doc.user_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    isPublic: doc.is_public
  };
}

export async function updateDocument(id: string, updates: Partial<Omit<MarkdownFile, 'id' | 'createdAt' | 'updatedAt'>>) {
  // Get current document
  const { data: currentDoc } = await supabase
    .from('markdown_documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!currentDoc) throw new Error('Document not found');

  // If content is being updated, update the file in storage
  if (updates.content !== undefined) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .update(currentDoc.storage_path, updates.content);

    if (uploadError) throw uploadError;
  }

  // Prepare database updates
  const dbUpdates: any = {};
  
  if (updates.title) {
    dbUpdates.alias = updates.title; // Update alias
  }
  
  if (updates.isPublic !== undefined) {
    dbUpdates.is_public = updates.isPublic;
  }

  // Update database record
  const { data: doc, error: dbError } = await supabase
    .from('markdown_documents')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (dbError) throw dbError;

  const content = updates.content || await getFileContent(doc.storage_path);

  return {
    id: doc.id,
    title: doc.alias || doc.file_name, // Show alias if exists, otherwise show file_name
    fileName: doc.file_name,
    content,
    userId: doc.user_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    isPublic: doc.is_public
  };
}

export async function deleteDocument(id: string) {
  // Get storage path before deleting
  const { data: doc } = await supabase
    .from('markdown_documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!doc) throw new Error('Document not found');

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([doc.storage_path]);

  if (storageError) throw storageError;

  // Delete from database
  const { error: dbError } = await supabase
    .from('markdown_documents')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;
}

async function getFileContent(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error) throw error;

  return await data.text();
}