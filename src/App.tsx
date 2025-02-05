import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { SignInModal } from './components/SignInModal';
import { AdminPanel } from './components/AdminPanel';
import { MarkdownEditor } from './components/MarkdownEditor';
import { FileText, Edit, Share2, Shield, LogOut } from 'lucide-react';
import type { User, MarkdownFile } from './types';
import { handleAuthStateChange, signOut } from './lib/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
} from './lib/documents';

function App() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [markdownFiles, setMarkdownFiles] = useState<MarkdownFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MarkdownFile | null>(null);
  const [isAdminView, setIsAdminView] = useState(true);
  const [isEditorView, setIsEditorView] = useState(false);
  const [tempNewFile, setTempNewFile] = useState<MarkdownFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    handleAuthStateChange((user) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
        });
        loadDocuments();
      } else {
        setUser(null);
        setMarkdownFiles([]);
        setSelectedFile(null);
        setIsAdminView(false);
        setIsEditorView(false);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('docId');
        window.history.pushState({}, '', newUrl);
      }
    }).then((sub) => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadDocuments = async () => {
    try {
      console.log('Loading documents...');
      const docs = await getDocuments();
      console.log('Documents loaded:', docs.length);
      setMarkdownFiles(docs);
      setError(null);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents. Please try again later.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('docId');

    if (docId) {
      const loadDocument = async () => {
        try {
          console.log('Loading document by ID:', docId);
          const doc = await getDocument(docId);
          if (doc && doc.isPublic) {
            console.log('Document loaded:', doc.id);
            setSelectedFile(doc);
            setIsAdminView(false);
            setIsEditorView(false);
            setError(null);
            
            setMarkdownFiles(prev => 
              prev.map(file => 
                file.id === doc.id ? doc : file
              )
            );
          } else {
            console.log('Document not found:', docId);
            setError('Document not found or not available.');
            setSelectedFile(null);
            setIsAdminView(false);
            setIsEditorView(false);
          }
        } catch (err) {
          console.error('Error loading document:', err);
          setError('Failed to load document. Please try again later.');
          setSelectedFile(null);
        }
      };

      loadDocument();
    }
  }, [window.location.search]);

  const handleSignIn = (user: SupabaseUser) => {
    setUser({
      id: user.id,
      email: user.email || '',
    });
    setIsSignInModalOpen(false);
    setIsAdminView(true);
    setIsEditorView(false);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const newFile = await createDocument({
          fileName: file.name,
          title: null,
          content: content,
          userId: user.id,
          isPublic: false,
        });
        setMarkdownFiles((prev) => [newFile, ...prev]);
      } catch (error) {
        console.error('Error creating document:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateNew = () => {
    if (!user) return;

    const uuid = crypto.randomUUID();
    const fileName = `${uuid}.md`;

    const tempFile: MarkdownFile = {
      id: 'temp-' + uuid,
      fileName: fileName,
      title: null,
      content: '',
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
    };
    setTempNewFile(tempFile);
    setSelectedFile(tempFile);
    setIsAdminView(false);
    setIsEditorView(true);
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteDocument(fileId);
      setMarkdownFiles((prev) => prev.filter((file) => file.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setIsEditorView(false);
        setIsAdminView(true);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleFileSelect = (file: MarkdownFile) => {
    setSelectedFile(file);
    setIsAdminView(false);
    setIsEditorView(false);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('docId', file.id);
    window.history.pushState({}, '', newUrl);
  };

  const handleEditFile = (file: MarkdownFile) => {
    setSelectedFile(file);
    setIsAdminView(false);
    setIsEditorView(true);
  };

  const handleFinishEditing = () => {
    setIsEditorView(false);
    setIsAdminView(true);
    setSelectedFile(null);
    setTempNewFile(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('docId');
    window.history.pushState({}, '', newUrl);
  };

  const handleUpdateContent = async (fileId: string, newContent: string) => {
    if (tempNewFile && fileId === tempNewFile.id) {
      try {
        const permanentFile = await createDocument({
          fileName: tempNewFile.fileName,
          title: null,
          content: newContent,
          userId: user?.id || '',
          isPublic: false,
        });
        setMarkdownFiles((prev) => [permanentFile, ...prev]);
        setTempNewFile(null);
        setSelectedFile(null);
        setIsEditorView(false);
        setIsAdminView(true);
      } catch (error) {
        console.error('Error creating document:', error);
      }
      return;
    }

    try {
      const updatedFile = await updateDocument(fileId, { content: newContent });
      setMarkdownFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            return updatedFile;
          }
          return file;
        })
      );

      if (selectedFile?.id === fileId) {
        setSelectedFile(updatedFile);
      }
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleUpdateTitle = async (fileId: string, newTitle: string) => {
    try {
      const updatedFile = await updateDocument(fileId, {
        title: newTitle || null,
      });
      setMarkdownFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            return updatedFile;
          }
          return file;
        })
      );
    } catch (error) {
      console.error('Error updating document title:', error);
    }
  };

  const handleToggleVisibility = async (fileId: string) => {
    if (isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }

    const file = markdownFiles.find((f) => f.id === fileId);
    if (!file) {
      console.error('File not found for visibility toggle:', fileId);
      return;
    }

    try {
      setIsUpdating(true);
      console.log('Toggling visibility for file:', fileId, 'current state:', file.isPublic);
      
      const updatedFile = await updateDocument(fileId, {
        isPublic: !file.isPublic,
      });
      
      console.log('Visibility updated successfully:', updatedFile.isPublic);

      setMarkdownFiles((prev) =>
        prev.map((f) => (f.id === fileId ? updatedFile : f))
      );

      if (selectedFile?.id === fileId) {
        console.log('Reloading selected file after visibility update');
        const reloadedDoc = await getDocument(fileId);
        if (reloadedDoc) {
          setSelectedFile(reloadedDoc);
        }
      }
    } catch (error) {
      console.error('Error updating document visibility:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getShareableLink = (fileId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('docId', fileId);
    return url.toString();
  };

  if (user) {
    return (
      <div className="min-h-screen bg-white relative">
        <div className="w-full h-20 px-6 flex justify-between items-center border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditorView
              ? tempNewFile
                ? 'New Document'
                : 'Edit Document'
              : isAdminView
              ? 'Admin Panel'
              : ''}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {user.email[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-600">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors ${
                isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <LogOut size={20} />
              <span>{isSigningOut ? 'Sign Out' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {isEditorView && (selectedFile || tempNewFile) ? (
          <MarkdownEditor
            file={tempNewFile || selectedFile!}
            onSave={handleUpdateContent}
            onFinish={handleFinishEditing}
          />
        ) : isAdminView ? (
          <AdminPanel
            markdownFiles={markdownFiles}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onSelect={handleFileSelect}
            onEdit={handleEditFile}
            onUpdateTitle={handleUpdateTitle}
            onToggleVisibility={handleToggleVisibility}
            getShareableLink={getShareableLink}
            onCreateNew={handleCreateNew}
          />
        ) : selectedFile ? (
          <div className="container mx-auto px-4 pt-12 pb-16 max-w-4xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-4xl font-bold mb-6" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-3xl font-bold mb-4 mt-8" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-2xl font-bold mb-3 mt-6" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-4 text-gray-700" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-600 hover:text-blue-800 underline"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-6 mb-4" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-6 mb-4" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-200 pl-4 italic my-4"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }) =>
                  inline ? (
                    <code
                      className="bg-gray-100 rounded px-1 py-0.5"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"
                      {...props}
                    />
                  ),
                img: ({ node, ...props }) => (
                  <img
                    className="max-w-full h-auto rounded-lg my-4"
                    {...props}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table
                      className="min-w-full border border-gray-200"
                      {...props}
                    />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="border border-gray-200 px-4 py-2 bg-gray-50"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-200 px-4 py-2" {...props} />
                ),
              }}
            >
              {selectedFile.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-2xl">Document not found</p>
          </div>
        )}
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full h-20 px-6 flex justify-between items-center border-b border-gray-100">
          <div></div>
          {user && (
            <button
              onClick={() => {
                setIsAdminView(true);
                setSelectedFile(null);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('docId');
                window.history.pushState({}, '', newUrl);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Admin Panel
            </button>
          )}
        </div>

        <div className="container mx-auto px-4 pt-12 pb-16 max-w-4xl">
          {selectedFile.isPublic ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-4xl font-bold mb-6" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-3xl font-bold mb-4 mt-8" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-2xl font-bold mb-3 mt-6" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-4 text-gray-700" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-600 hover:text-blue-800 underline"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-6 mb-4" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-6 mb-4" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-200 pl-4 italic my-4"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }) =>
                  inline ? (
                    <code
                      className="bg-gray-100 rounded px-1 py-0.5"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"
                      {...props}
                    />
                  ),
                img: ({ node, ...props }) => (
                  <img
                    className="max-w-full h-auto rounded-lg my-4"
                    {...props}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table
                      className="min-w-full border border-gray-200"
                      {...props}
                    />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="border border-gray-200 px-4 py-2 bg-gray-50"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-200 px-4 py-2" {...props} />
                ),
              }}
            >
              {selectedFile.content}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-2xl">This document is private</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <p className="text-gray-600 text-xl">{error}</p>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onSignIn={handleSignIn}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Your Markdown Publishing Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create, edit, and share your markdown documents with ease. Perfect
              for documentation, blogs, and technical writing.
            </p>
            <button
              onClick={() => setIsSignInModalOpen(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Sign Up Now
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-700 via-blue-800 to-transparent"></div>
        </div>
      </div>

      <div className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Everything you need for markdown publishing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Edit className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Rich Markdown Editor
              </h3>
              <p className="text-gray-600">
                Write in markdown with our intuitive editor featuring live
                preview and support for GitHub Flavored Markdown.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Share2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Easy Sharing
              </h3>
              <p className="text-gray-600">
                Share your documents with anyone using public links, or keep
                them private for your eyes only.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Secure Access
              </h3>
              <p className="text-gray-600">
                Control who can view your documents with our simple but powerful
                privacy settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to start publishing?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join now and experience the easiest way to create and share markdown
            documents.
          </p>
          <button
            onClick={() => setIsSignInModalOpen(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Sign Up Now
          </button>
        </div>
      </div>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSignIn={handleSignIn}
      />
    </div>
  );
}

export default App;