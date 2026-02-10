'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

interface PostContentProps {
  content: string; // JSON string from database
}

export function PostContent({ content }: PostContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
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
        HTMLAttributes: {
          class: 'post-link text-action-primary hover:underline',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'post-code-block bg-bg-secondary p-4 rounded-lg',
        },
      }),
      Table.configure({
        HTMLAttributes: {
          class: 'post-table border-collapse border border-border',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: (() => {
      try {
        const parsed = JSON.parse(content);
        // Validate content structure
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          return parsed;
        }
        // If invalid, return empty doc
        console.warn('Invalid content structure, using empty document');
        return { type: 'doc', content: [] };
      } catch (error) {
        console.error('Error parsing content:', error);
        return { type: 'doc', content: [] };
      }
    })(),
    editable: false, // Read-only for display
  });

  if (!editor) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="tiptap-content">
      <EditorContent editor={editor} />
    </div>
  );
}
