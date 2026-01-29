'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { EditorToolbar } from './EditorToolbar';
import { uploadImage, getAuthToken } from '@rentalshop/utils';

interface RichTextEditorProps {
  content?: string; // JSON string from database
  onChange?: (content: string) => void; // Callback with JSON string
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'Start writing...',
  editable = true 
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default image handling
        // We'll use custom image extension
      }),
      Image.configure({
        inline: true,
        allowBase64: false, // Force S3 URLs only
        HTMLAttributes: {
          class: 'post-image max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'post-link text-action-primary hover:underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'post-code-block bg-bg-secondary p-4 rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'post-table border-collapse border border-border',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content ? JSON.parse(content) : undefined,
    editable,
    onUpdate: ({ editor }) => {
      // Convert to JSON string for storage
      const json = JSON.stringify(editor.getJSON());
      onChange?.(json);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    if (!editor) return;

    try {
      const token = await getAuthToken();
      const result = await uploadImage(file, token, {
        folder: 'blog',
        quality: 0.85,
        maxSizeMB: 2, // Larger for blog posts
      });

      if (result.success && result.data?.url) {
        // Insert image at current cursor position
        editor.chain().focus().setImage({ src: result.data.url }).run();
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    }
  };

  if (!editor) {
    return <div className="p-4">Loading editor...</div>;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {editable && <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />}
      <EditorContent 
        editor={editor} 
        className="focus-within:outline-none"
      />
    </div>
  );
}
