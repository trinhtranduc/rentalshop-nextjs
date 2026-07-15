'use client';

import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Code, Code2,
  Link, Link2Off, Image, Table,
  Undo, Redo, Minus, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Subscript, Superscript, Youtube,
  Palette, Type
} from 'lucide-react';
import { Button } from '../../ui/button';

interface EditorToolbarProps {
  editor: Editor;
  onOpenImagePicker: () => void;
}

// Toolbar button component
function ToolbarButton({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  title,
  children 
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  disabled?: boolean; 
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-bg-tertiary text-action-primary' : ''}`}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border mx-0.5" />;
}

export function EditorToolbar({ editor, onOpenImagePicker }: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl || 'https://');

    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt('YouTube URL:', 'https://www.youtube.com/watch?v=');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#cccccc',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#ffffff',
  ];

  const highlightColors = [
    '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3',
    '#fed7aa', '#ccfbf1', '#dbeafe', '#fce7f3', '#f3f4f6',
  ];

  return (
    <div className="flex items-center gap-0.5 p-2 flex-wrap">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        title="Subscript"
      >
        <Subscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        title="Superscript"
      >
        <Superscript className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Text Color */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowHighlightPicker(false);
          }}
          title="Text Color"
        >
          <Palette className="h-4 w-4" />
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-border z-50 grid grid-cols-5 gap-1 w-[140px]">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setShowColorPicker(false);
                }}
              />
            ))}
            <button
              type="button"
              className="col-span-5 mt-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setShowColorPicker(false);
              }}
            >
              Reset color
            </button>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowHighlightPicker(!showHighlightPicker);
            setShowColorPicker(false);
          }}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-border z-50 grid grid-cols-5 gap-1 w-[140px]">
            {highlightColors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color }).run();
                  setShowHighlightPicker(false);
                }}
              />
            ))}
            <button
              type="button"
              className="col-span-5 mt-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setShowHighlightPicker(false);
              }}
            >
              Remove highlight
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        isActive={editor.isActive('heading', { level: 4 })}
        title="Heading 4"
      >
        <Heading4 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Lists & Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Media & Links */}
      <ToolbarButton
        onClick={onOpenImagePicker}
        title="Insert Image"
      >
        <Image className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Insert Link"
      >
        <Link className="h-4 w-4" />
      </ToolbarButton>
      {editor.isActive('link') && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
        >
          <Link2Off className="h-4 w-4" />
        </ToolbarButton>
      )}
      <ToolbarButton
        onClick={addYoutube}
        title="Embed YouTube"
      >
        <Youtube className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert Table"
      >
        <Table className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Utilities */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear Formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
