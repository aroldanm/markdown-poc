import React, { useState } from 'react';
import { Plus, Trash2, FileText, Pencil, Check, X, Share2, Edit, Globe, Lock, Upload } from 'lucide-react';
import type { MarkdownFile } from '../types';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface AdminPanelProps {
  markdownFiles: MarkdownFile[];
  onUpload: (file: File) => void;
  onDelete: (fileId: string) => void;
  onSelect: (file: MarkdownFile) => void;
  onEdit: (file: MarkdownFile) => void;
  onUpdateTitle: (fileId: string, newTitle: string) => void;
  onToggleVisibility: (fileId: string) => void;
  getShareableLink: (fileId: string) => string;
  onCreateNew: () => void;
}

export function AdminPanel({ 
  markdownFiles, 
  onUpload, 
  onDelete, 
  onSelect,
  onEdit,
  onUpdateTitle,
  onToggleVisibility,
  getShareableLink,
  onCreateNew
}: AdminPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<MarkdownFile | null>(null);
  const [processingVisibility, setProcessingVisibility] = useState<string | null>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const markdownFiles = Array.from(files).filter(file => file.name.endsWith('.md'));
      markdownFiles.forEach(file => {
        onUpload(file);
      });

      if (markdownFiles.length === 0) {
        alert('Please select only markdown (.md) files');
      }
    }
  };

  const startEditing = (e: React.MouseEvent, file: MarkdownFile) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditingTitle(file.title || '');
  };

  const saveTitle = (fileId: string) => {
    onUpdateTitle(fileId, editingTitle);
    setEditingId(null);
    setEditingTitle('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleShare = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const link = getShareableLink(fileId);
    
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(fileId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDelete = (e: React.MouseEvent, file: MarkdownFile) => {
    e.stopPropagation();
    setFileToDelete(file);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      onDelete(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleVisibilityToggle = async (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (processingVisibility === fileId) return; // Prevent double-clicks
    
    try {
      setProcessingVisibility(fileId);
      await onToggleVisibility(fileId);
    } finally {
      setProcessingVisibility(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Your Markdown Files</h2>
        <div className="flex gap-4">
          <button
            onClick={onCreateNew}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <Plus size={20} className="mr-2" />
            <span>Create new</span>
          </button>
          <label className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload size={20} className="mr-2" />
            <span>Upload files</span>
            <input
              type="file"
              accept=".md"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[45%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="w-[15%] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visibility
              </th>
              <th className="w-[10%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {markdownFiles.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 truncate">
                  {editingId === file.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => saveTitle(file.id)}
                        className="text-green-600 hover:text-green-800 flex-shrink-0"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-red-600 hover:text-red-800 flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {file.title || file.fileName}
                      </span>
                      <button
                        onClick={(e) => startEditing(e, file)}
                        className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 truncate text-sm text-gray-500">
                  {formatDate(file.createdAt)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => handleVisibilityToggle(e, file.id)}
                    disabled={processingVisibility === file.id}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm w-24 justify-center transition-all duration-200 ${
                      processingVisibility === file.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : file.isPublic
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    title={file.isPublic ? 'Make private' : 'Make public'}
                  >
                    {file.isPublic ? (
                      <>
                        <Globe size={16} className="flex-shrink-0" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} className="flex-shrink-0" />
                        <span>Private</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3 w-[100px] ml-auto">
                    <div className="w-[20px]">
                      <button
                        onClick={(e) => file.isPublic && handleShare(e, file.id)}
                        className={`relative group ${
                          file.isPublic 
                            ? 'text-blue-600 hover:text-blue-800' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={file.isPublic ? 'Share link' : 'Make public to share'}
                        disabled={!file.isPublic}
                      >
                        <Share2 size={20} />
                        {copiedId === file.id && (
                          <span className="absolute -top-8 -left-6 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Link copied!
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="w-[20px]">
                      <button
                        onClick={() => onEdit(file)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit document"
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                    <div className="w-[20px]">
                      <button
                        onClick={(e) => handleDelete(e, file)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {markdownFiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No markdown files uploaded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationDialog
        isOpen={fileToDelete !== null}
        onClose={() => setFileToDelete(null)}
        onConfirm={confirmDelete}
        fileName={fileToDelete?.title || fileToDelete?.fileName || ''}
      />
    </div>
  );
}