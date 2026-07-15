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
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Youtube from '@tiptap/extension-youtube';
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
        // Disable default code block — we use custom one
        codeBlock: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'post-image max-w-full h-auto rounded-lg',
        },
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
          class: 'post-code-block bg-bg-secondary p-4 rounded-lg font-mono text-sm',
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
      Youtube.configure({
        inline: false,
        HTMLAttributes: {
          class: 'post-youtube rounded-lg overflow-hidden',
        },
      }),
    ],
    content: content ? (() => {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          if (!parsed.content || !Array.isArray(parsed.content)) {
            return { type: 'doc', content: [] };
          }
          return parsed;
        }
        return { type: 'doc', content: [] };
      } catch (error) {
        console.error('Error parsing content:', error);
        return { type: 'doc', content: [] };
      }
    })() : undefined,
    editable,
    onUpdate: ({ editor }) => {
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

  try {
    editor.getJSON();
  } catch (error) {
    console.error('Editor state is invalid, resetting...', error);
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
