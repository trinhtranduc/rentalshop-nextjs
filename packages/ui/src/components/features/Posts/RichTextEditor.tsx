'use client';

import React, { useState } from 'react';
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
import { PostImagePickerDialog } from './PostImagePickerDialog';

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
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default image handling
        // We'll use custom image extension
      }),
      Image.configure({
        inline: true,
        allowBase64: false, // HTTPS image URLs only (S3 / CloudFront)
        HTMLAttributes: {
          class: 'post-image max-w-full h-auto rounded-lg',
        },
        // Handle image loading errors gracefully
        addAttributes() {
          return {
            ...this.parent?.(),
            onError: {
              default: null,
              parseHTML: () => null,
              renderHTML: () => ({
                onerror: 'this.style.display="none"',
              }),
            },
          };
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
    content: content ? (() => {
      try {
        const parsed = JSON.parse(content);
        // Validate content structure - must be a doc node
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          // Ensure content array exists
          if (!parsed.content || !Array.isArray(parsed.content)) {
            console.warn('Content missing content array, initializing empty');
            return { type: 'doc', content: [] };
          }
          return parsed;
        }
        // If invalid, return empty doc
        console.warn('Invalid content structure, using empty document');
        return { type: 'doc', content: [] };
      } catch (error) {
        console.error('Error parsing content:', error);
        return { type: 'doc', content: [] };
      }
    })() : undefined,
    editable,
    onUpdate: ({ editor }) => {
      // Convert to JSON string for storage
      const json = JSON.stringify(editor.getJSON());
      onChange?.(json);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none min-h-[12rem] p-4',
      },
    },
  });

  if (!editor) {
    return <div className="p-4">Loading editor...</div>;
  }

  // Check if editor is in a valid state
  try {
    editor.getJSON();
  } catch (error) {
    console.error('Editor state is invalid, resetting...', error);
    // Try to reset editor with empty content
    setTimeout(() => {
      editor.commands.setContent({ type: 'doc', content: [] });
    }, 0);
  }

  return (
    <>
      <div className="flex h-[min(72vh,640px)] min-h-[280px] flex-col overflow-hidden rounded-lg border border-border">
        {editable && (
          <div className="shrink-0 border-b border-border bg-bg-secondary">
            <EditorToolbar
              editor={editor}
              onOpenImagePicker={() => setImagePickerOpen(true)}
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-bg-card">
          <EditorContent editor={editor} className="h-full focus-within:outline-none" />
        </div>
      </div>
      <PostImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onPick={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
        title="Chèn ảnh vào bài viết"
      />
    </>
  );
}
