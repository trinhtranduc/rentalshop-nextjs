'use client';

import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link,
  Image, Table, Undo, Redo
} from 'lucide-react';
import { Button } from '../../ui/button';

interface EditorToolbarProps {
  editor: Editor;
  onOpenImagePicker: () => void;
}

export function EditorToolbar({ editor, onOpenImagePicker }: EditorToolbarProps) {

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-bg-secondary flex-wrap">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleBold().run();
          } catch (error) {
            console.error('Error toggling bold:', error);
          }
        }}
        className={editor.isActive('bold') ? 'bg-bg-tertiary' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleItalic().run();
          } catch (error) {
            console.error('Error toggling italic:', error);
          }
        }}
        className={editor.isActive('italic') ? 'bg-bg-tertiary' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Headings */}
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            if (!editor.isEditable) return;
            // Ensure editor is focused first
            editor.chain().focus().setHeading({ level: 1 }).run();
          } catch (error) {
            console.error('Error setting heading 1:', error);
            // Fallback: try to insert heading manually
            try {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              editor.chain()
                .focus()
                .deleteSelection()
                .insertContent({
                  type: 'heading',
                  attrs: { level: 1 },
                  content: text ? [{ type: 'text', text }] : []
                })
                .run();
            } catch (fallbackError) {
              console.error('Fallback heading 1 failed:', fallbackError);
            }
          }
        }}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-bg-tertiary' : ''}
        disabled={!editor.isEditable}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            if (!editor.isEditable) return;
            // Ensure editor is focused first
            editor.chain().focus().setHeading({ level: 2 }).run();
          } catch (error) {
            console.error('Error setting heading 2:', error);
            // Fallback: try to insert heading manually
            try {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              editor.chain()
                .focus()
                .deleteSelection()
                .insertContent({
                  type: 'heading',
                  attrs: { level: 2 },
                  content: text ? [{ type: 'text', text }] : []
                })
                .run();
            } catch (fallbackError) {
              console.error('Fallback heading 2 failed:', fallbackError);
            }
          }
        }}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-bg-tertiary' : ''}
        disabled={!editor.isEditable}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            if (!editor.isEditable) return;
            // Ensure editor is focused first
            editor.chain().focus().setHeading({ level: 3 }).run();
          } catch (error) {
            console.error('Error setting heading 3:', error);
            // Fallback: try to insert heading manually
            try {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              editor.chain()
                .focus()
                .deleteSelection()
                .insertContent({
                  type: 'heading',
                  attrs: { level: 3 },
                  content: text ? [{ type: 'text', text }] : []
                })
                .run();
            } catch (fallbackError) {
              console.error('Fallback heading 3 failed:', fallbackError);
            }
          }
        }}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-bg-tertiary' : ''}
        disabled={!editor.isEditable}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      {/* Lists */}
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleBulletList().run();
          } catch (error) {
            console.error('Error toggling bullet list:', error);
          }
        }}
        className={editor.isActive('bulletList') ? 'bg-bg-tertiary' : ''}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleOrderedList().run();
          } catch (error) {
            console.error('Error toggling ordered list:', error);
          }
        }}
        className={editor.isActive('orderedList') ? 'bg-bg-tertiary' : ''}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleBlockquote().run();
          } catch (error) {
            console.error('Error toggling blockquote:', error);
          }
        }}
        className={editor.isActive('blockquote') ? 'bg-bg-tertiary' : ''}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          try {
            editor.chain().focus().toggleCodeBlock().run();
          } catch (error) {
            console.error('Error toggling code block:', error);
          }
        }}
        className={editor.isActive('codeBlock') ? 'bg-bg-tertiary' : ''}
      >
        <Code className="h-4 w-4" />
      </Button>

      {/* Media */}
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onOpenImagePicker}
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={editor.isActive('link') ? 'bg-bg-tertiary' : ''}
      >
        <Link className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table className="h-4 w-4" />
      </Button>

      {/* History */}
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}
