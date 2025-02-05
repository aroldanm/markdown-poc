import React, { useState, useEffect, useRef } from 'react';
import type { MarkdownFile } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Bold, Italic, Link2, Quote, Image, Heading1, Heading2, Heading3 } from 'lucide-react';

interface MarkdownEditorProps {
  file: MarkdownFile;
  onSave: (fileId: string, content: string) => void;
  onFinish: () => void;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  blockPrefix?: string;
  blockSuffix?: string;
}

export function MarkdownEditor({ file, onSave, onFinish }: MarkdownEditorProps) {
  const [content, setContent] = useState(file.content);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const toolbarButtons: ToolbarButton[] = [
    {
      icon: <Heading1 size={18} />,
      label: 'Heading 1',
      prefix: '# ',
      suffix: '',
      blockPrefix: '# ',
      blockSuffix: ''
    },
    {
      icon: <Heading2 size={18} />,
      label: 'Heading 2',
      prefix: '## ',
      suffix: '',
      blockPrefix: '## ',
      blockSuffix: ''
    },
    {
      icon: <Heading3 size={18} />,
      label: 'Heading 3',
      prefix: '### ',
      suffix: '',
      blockPrefix: '### ',
      blockSuffix: ''
    },
    {
      icon: <Bold size={18} />,
      label: 'Bold',
      prefix: '**',
      suffix: '**'
    },
    {
      icon: <Italic size={18} />,
      label: 'Italic',
      prefix: '_',
      suffix: '_'
    },
    {
      icon: <Link2 size={18} />,
      label: 'Link',
      prefix: '[',
      suffix: '](url)'
    },
    {
      icon: <Image size={18} />,
      label: 'Image',
      prefix: '![',
      suffix: '](url)'
    },
    {
      icon: <Quote size={18} />,
      label: 'Quote',
      prefix: '> ',
      suffix: '',
      blockPrefix: '> ',
      blockSuffix: ''
    }
  ];

  const handleSave = () => {
    onSave(file.id, content);
    onFinish();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const insertText = (button: ToolbarButton) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    let newText = '';
    
    // If it's a block-level formatting (quote, list, headings)
    if (button.blockPrefix) {
      // Split the selected text into lines
      const lines = selectedText.split('\n');
      // Add prefix to each line
      const formattedLines = lines.map(line => button.blockPrefix + line).join('\n');
      newText = beforeText + formattedLines + button.blockSuffix + afterText;
    } else {
      // For inline formatting (bold, italic, link)
      newText = beforeText + button.prefix + selectedText + button.suffix + afterText;
    }

    setContent(newText);

    // Focus back on textarea and set cursor position
    textarea.focus();
    const newCursorPos = start + button.prefix.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  };

  // Initial content setup and viewport meta adjustment
  useEffect(() => {
    // Set initial content
    if (textareaRef.current) {
      textareaRef.current.value = file.content;
    }

    // Add viewport meta tag to prevent zooming on mobile
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);

    // Cleanup
    return () => {
      const oldMeta = document.querySelector('meta[name="viewport"]');
      if (oldMeta) {
        oldMeta.remove();
      }
    };
  }, [file.content]);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col max-w-4xl">
      {/* Edit menu bar */}
      <div className="w-full bg-white mb-4 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex h-[38px]">
            <button
              onClick={() => setIsPreview(false)}
              className={`
                px-6 h-full text-sm font-medium
                border border-gray-300
                first:rounded-l-lg last:rounded-none
                focus:outline-none focus:z-10
                transition-colors duration-200
                ${!isPreview
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              Edit
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`
                px-6 h-full text-sm font-medium
                border border-gray-300 border-l-0
                first:rounded-none last:rounded-r-lg
                focus:outline-none focus:z-10
                transition-colors duration-200
                ${isPreview
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              Preview
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onFinish}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors duration-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        {!isPreview && (
          <div className="px-6 py-2 border-b border-gray-200 flex gap-1">
            {toolbarButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => insertText(button)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title={button.label}
              >
                {button.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor/Preview area */}
      <div className="w-full bg-white flex-grow">
        {isPreview ? (
          <div 
            ref={previewRef}
            className="w-full px-6 py-6"
          >
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-6" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-3xl font-bold mb-4 mt-8" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-2xl font-bold mb-3 mt-6" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 text-gray-700" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-4" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-4" {...props} />,
                  li: ({node, ...props}) => <li className="mb-2" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4" {...props} />
                  ),
                  code: ({node, inline, ...props}) => (
                    inline ? 
                    <code className="bg-gray-100 rounded px-1 py-0.5" {...props} /> :
                    <code className="block bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto" {...props} />
                  ),
                  img: ({node, ...props}) => (
                    <img className="max-w-full h-auto rounded-lg my-4" {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-gray-200" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className="border border-gray-200 px-4 py-2 bg-gray-50" {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className="border border-gray-200 px-4 py-2" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-12rem)] p-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              className="w-full h-full p-6 font-mono text-gray-800 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors duration-200"
              placeholder="Write your markdown content here..."
              style={{
                resize: 'none',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}