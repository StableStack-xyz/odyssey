import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  RemoveFormatting,
  Undo,
  Redo,
  Code,
  Eye,
} from 'lucide-react';

export interface RichTextEditorRef {
  insertTag: (tag: string) => void;
  insertHTML: (html: string) => void;
  focus: () => void;
  getContent: () => string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Type your message content here...',
      minHeight = '180px',
      className = '',
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastRangeRef = useRef<Range | null>(null);

    const [isSourceMode, setIsSourceMode] = useState(false);
    const [activeFormats, setActiveFormats] = useState<{
      bold: boolean;
      italic: boolean;
      underline: boolean;
      strikeThrough: boolean;
      insertUnorderedList: boolean;
      insertOrderedList: boolean;
    }>({
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      insertUnorderedList: false,
      insertOrderedList: false,
    });

    // Save selection range so external buttons (like merge tags) insert at cursor
    const saveSelection = useCallback(() => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // Only save if inside editor
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          lastRangeRef.current = range.cloneRange();
        }
      }
    }, []);

    // Check formatting states for toolbar button highlights
    const checkActiveFormats = useCallback(() => {
      if (typeof document === 'undefined' || isSourceMode) return;
      try {
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList'),
          insertOrderedList: document.queryCommandState('insertOrderedList'),
        });
      } catch (e) {
        // queryCommandState may throw in edge browser cases
      }
    }, [isSourceMode]);

    // Restore selection range
    const restoreSelection = useCallback(() => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && lastRangeRef.current && editorRef.current) {
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
      }
    }, []);

    // Synchronize initial & external value to contentEditable
    useEffect(() => {
      if (editorRef.current) {
        // Convert plain linebreaks to html if not already html
        const currentHtml = editorRef.current.innerHTML;
        const normalizedValue = value || '';
        if (currentHtml !== normalizedValue) {
          editorRef.current.innerHTML = normalizedValue;
        }
      }
    }, [value]);

    // Format action executor
    const format = useCallback(
      (command: string, arg: string | undefined = undefined) => {
        if (isSourceMode) return;
        if (editorRef.current) {
          editorRef.current.focus();
          restoreSelection();
          document.execCommand(command, false, arg);
          saveSelection();
          checkActiveFormats();
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }
      },
      [isSourceMode, restoreSelection, saveSelection, checkActiveFormats, onChange]
    );

    // Prompt for link insertion
    const handleInsertLink = useCallback(() => {
      if (isSourceMode) return;
      restoreSelection();
      const url = window.prompt('Enter target link URL (e.g., https://example.com):', 'https://');
      if (url && url.trim() && url !== 'https://') {
        format('createLink', url.trim());
      }
    }, [isSourceMode, restoreSelection, format]);

    // Handle block formatting (headings, blockquotes)
    const handleFormatBlock = useCallback(
      (tag: string) => {
        format('formatBlock', `<${tag}>`);
      },
      [format]
    );

    // Expose methods to parent components (like Merge Tag buttons)
    useImperativeHandle(
      ref,
      () => ({
        insertTag: (tag: string) => {
          if (isSourceMode && textareaRef.current) {
            const el = textareaRef.current;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const prev = el.value;
            const next = prev.substring(0, start) + tag + prev.substring(end);
            onChange(next);
            setTimeout(() => {
              el.focus();
              el.setSelectionRange(start + tag.length, start + tag.length);
            }, 50);
            return;
          }

          if (editorRef.current) {
            editorRef.current.focus();
            restoreSelection();

            // Insert HTML tag as clean text or tag span
            const success = document.execCommand('insertText', false, tag);
            if (!success && lastRangeRef.current) {
              const textNode = document.createTextNode(tag);
              lastRangeRef.current.deleteContents();
              lastRangeRef.current.insertNode(textNode);
              lastRangeRef.current.setStartAfter(textNode);
              lastRangeRef.current.collapse(true);
            }

            saveSelection();
            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
          }
        },
        insertHTML: (html: string) => {
          if (editorRef.current) {
            editorRef.current.focus();
            restoreSelection();
            document.execCommand('insertHTML', false, html);
            saveSelection();
            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
          }
        },
        focus: () => {
          if (isSourceMode) {
            textareaRef.current?.focus();
          } else {
            editorRef.current?.focus();
          }
        },
        getContent: () => {
          return editorRef.current?.innerHTML || value;
        },
      }),
      [isSourceMode, onChange, restoreSelection, saveSelection, value]
    );

    // Input changes from contentEditable
    const handleInput = useCallback(() => {
      if (editorRef.current) {
        saveSelection();
        checkActiveFormats();
        onChange(editorRef.current.innerHTML);
      }
    }, [onChange, saveSelection, checkActiveFormats]);

    // Calculate approximate text word count
    const wordCount = (value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean).length;

    return (
      <div
        className={`rounded-xl border border-graphite-hairline bg-paper overflow-hidden shadow-xs transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 ${className}`}
      >
        {/* Toolbar Header */}
        <div className="flex items-center justify-between flex-wrap gap-1 p-1.5 bg-vellum/50 border-b border-graphite-hairline text-slate">
          {/* Left: Formatting Buttons */}
          <div className="flex items-center flex-wrap gap-0.5">
            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('bold');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.bold ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Bold (Ctrl+B / Cmd+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('italic');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.italic ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Italic (Ctrl+I / Cmd+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('underline');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.underline ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Underline (Ctrl+U / Cmd+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('strikeThrough');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.strikeThrough ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-graphite-hairline mx-1" />

            {/* Bullet List */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('insertUnorderedList');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.insertUnorderedList ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Bulleted List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('insertOrderedList');
              }}
              className={`p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer ${
                activeFormats.insertOrderedList ? 'bg-paper text-emerald-600 font-bold shadow-xs' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-graphite-hairline mx-1" />

            {/* Heading 2 */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleFormatBlock('h2');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>

            {/* Heading 3 */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleFormatBlock('h3');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleFormatBlock('blockquote');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Quote Callout"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            {/* Link */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleInsertLink();
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Insert Hyperlink"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>

            {/* Clear formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('removeFormat');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-graphite-hairline mx-1" />

            {/* Undo */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('undo');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                format('redo');
              }}
              className="p-1.5 rounded hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Mode Switcher (Visual vs Raw HTML) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSourceMode(!isSourceMode)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isSourceMode ? 'bg-ink text-paper' : 'hover:bg-paper hover:text-ink'
              }`}
              title={isSourceMode ? 'Switch to Visual Editor' : 'Switch to Raw HTML Code'}
            >
              {isSourceMode ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Visual Mode</span>
                </>
              ) : (
                <>
                  <Code className="w-3 h-3" />
                  <span>HTML Source</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor Body */}
        {isSourceMode ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            className="w-full p-4 font-mono text-xs text-ink bg-paper resize-y outline-none leading-relaxed border-0"
            placeholder={placeholder}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyUp={() => {
              saveSelection();
              checkActiveFormats();
            }}
            onMouseUp={() => {
              saveSelection();
              checkActiveFormats();
            }}
            onBlur={() => {
              saveSelection();
            }}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="w-full p-4 font-sans text-xs text-ink bg-paper outline-none leading-relaxed overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate/60 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-slate [&_a]:text-purple-600 [&_a]:underline"
          />
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-vellum/30 border-t border-graphite-hairline/60 text-[10px] text-slate font-mono">
          <div className="flex items-center gap-2">
            <span>Mode: {isSourceMode ? 'HTML Source' : 'Rich Text (WYSIWYG)'}</span>
            <span>•</span>
            <span>Formatted HTML Output</span>
          </div>
          <div>
            {wordCount} words &bull; {(value || '').length} chars
          </div>
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
