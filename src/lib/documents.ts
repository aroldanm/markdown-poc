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
    try {
      const content = await getFileContent(doc.storage_path);
      return {
        id: doc.id,
        title: doc.alias,
        fileName: doc.file_name,
        content,
        userId: doc.user_id,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        isPublic: doc.is_public
      };
    } catch (error) {
      console.error(`Error loading content for document ${doc.id}:`, error);
      return null;
    }
  }));
  
  return docs.filter((doc): doc is MarkdownFile => doc !== null);
}

export async function getDocument(id: string) {
  // First check if the document exists and if we have permission to access it
  const { data: doc, error: docError } = await supabase
    .from('markdown_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (docError) {
    console.error('Error fetching document:', docError);
    return null;
  }

  if (!doc) {
    console.error('Document not found');
    return null;
  }

  try {
    // Get the file content
    const content = await getFileContent(doc.storage_path);

    return {
      id: doc.id,
      title: doc.alias,
      fileName: doc.file_name,
      content,
      userId: doc.user_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      isPublic: doc.is_public
    };
  } catch (error) {
    console.error('Error fetching document content:', error);
    return null;
  }
}

export async function checkFileNameExists(fileName: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('markdown_documents')
    .select('*', { count: 'exact', head: true })
    .eq('file_name', fileName);

  if (error) throw error;
  return count !== null && count > 0;
}

export async function createDocument(document: Omit<MarkdownFile, 'id' | 'createdAt' | 'updatedAt'>) {
  // Generate a UUID for the document
  const { data: { id: docId }, error: idError } = await supabase.rpc('generate_uuid');
  if (idError) throw idError;

  // Create the storage path using the original file name
  const storagePath = `${document.userId}/${document.fileName}`;

  // Create database record with storage path
  const { data: doc, error: dbError } = await supabase
    .from('markdown_documents')
    .insert({
      id: docId,
      alias: document.title,
      file_name: document.fileName,
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
    title: doc.alias,
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
    .select('storage_path, is_public')
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

  // Prepare database updates with optimistic locking
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.title !== undefined) {
    dbUpdates.alias = updates.title;
  }
  
  if (updates.isPublic !== undefined) {
    dbUpdates.is_public = updates.isPublic;
  }

  // Update database record with optimistic locking
  const { data: doc, error: dbError } = await supabase
    .from('markdown_documents')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (dbError) throw dbError;

  // Get the latest content
  const content = updates.content || await getFileContent(doc.storage_path);

  return {
    id: doc.id,
    title: doc.alias,
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