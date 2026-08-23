import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';

export interface MarkdownEditorHandle {
  insertText: (textToInsert: string, cursorOffset?: number) => void;
  wrapSelection: (prefix: string, suffix: string, defaultPlaceholder?: string) => void;
  replaceSelection: (replacement: string) => void;
  getSelectedText: () => string;
  getSelectionRange: () => { start: number; end: number };
  focus: () => void;
  scrollToLine: (lineNumber: number) => void;
  getTextarea: () => HTMLTextAreaElement | null;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selectedText: string, start: number, end: number) => void;
  fontSize?: number;
  fontFamily?: 'sans' | 'serif' | 'mono';
  lineNumbers?: boolean;
  wordWrap?: boolean;
  placeholder?: string;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onKeyDownShortcut?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  (
    {
      value,
      onChange,
      onSelectionChange,
      fontSize = 15,
      fontFamily = 'mono',
      lineNumbers = true,
      wordWrap = true,
      placeholder,
      onScroll,
      onKeyDownShortcut,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const [linesCount, setLinesCount] = useState(1);
    const [currentLine, setCurrentLine] = useState(1);

    useEffect(() => {
      const lines = (value || '').split('\n').length;
      setLinesCount(Math.max(1, lines));
    }, [value]);

    const lineHeight = fontSize * 1.6;

    const syncCurrentLine = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const upToCursor = value.substring(0, textarea.selectionStart);
      setCurrentLine(upToCursor.split('\n').length);
    };

    // Insert an image (from paste or drag&drop) as a base64 data-URL markdown node
    const insertImageFile = (file: File) => {
      const textarea = textareaRef.current;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        console.warn('Image too large to embed (>5MB):', file.name);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const safeName = (file.name || 'image').replace(/[()[\]]/g, '_');
        const start = textarea ? textarea.selectionStart : value.length;
        const markdownImage = `\n![${safeName}](${dataUrl})\n`;
        onChange(value.substring(0, start) + markdownImage + value.substring(start));
      };
      reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData?.files || []);
      const image = files.find((f) => f.type.startsWith('image/'));
      if (image) {
        e.preventDefault();
        insertImageFile(image);
      }
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.dataTransfer?.files || []);
      const image = files.find((f) => f.type.startsWith('image/'));
      if (image) {
        e.preventDefault();
        insertImageFile(image);
      }
    };

    useImperativeHandle(ref, () => ({
      insertText: (textToInsert: string, cursorOffset = textToInsert.length) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + textToInsert + value.substring(end);

        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          const newPos = start + cursorOffset;
          textarea.setSelectionRange(newPos, newPos);
          if (onSelectionChange) onSelectionChange('', newPos, newPos);
        }, 0);
      },

      wrapSelection: (prefix: string, suffix: string, defaultPlaceholder = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.substring(start, end) || defaultPlaceholder;
        const replacement = `${prefix}${selected}${suffix}`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);

        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          const selStart = start + prefix.length;
          const selEnd = selStart + selected.length;
          textarea.setSelectionRange(selStart, selEnd);
          if (onSelectionChange) onSelectionChange(selected, selStart, selEnd);
        }, 0);
      },

      replaceSelection: (replacement: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + replacement + value.substring(end);

        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          const newPos = start + replacement.length;
          textarea.setSelectionRange(newPos, newPos);
          if (onSelectionChange) onSelectionChange('', newPos, newPos);
        }, 0);
      },

      getSelectedText: () => {
        const textarea = textareaRef.current;
        if (!textarea) return '';
        return value.substring(textarea.selectionStart, textarea.selectionEnd);
      },

      getSelectionRange: () => {
        const textarea = textareaRef.current;
        if (!textarea) return { start: 0, end: 0 };
        return { start: textarea.selectionStart, end: textarea.selectionEnd };
      },

      focus: () => {
        textareaRef.current?.focus();
      },

      scrollToLine: (line: number) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const lineHeight = fontSize * 1.6;
        textarea.scrollTop = Math.max(0, (line - 2) * lineHeight);
      },

      getTextarea: () => textareaRef.current,
    }));

    const handleSelect = () => {
      const textarea = textareaRef.current;
      if (!textarea || !onSelectionChange) return;
      const selected = value.substring(textarea.selectionStart, textarea.selectionEnd);
      onSelectionChange(selected, textarea.selectionStart, textarea.selectionEnd);
      syncCurrentLine();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (onKeyDownShortcut) {
        onKeyDownShortcut(e);
      }

      if (e.defaultPrevented) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      // Handle Tab indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const tabSpaces = '  '; // 2 spaces

        if (e.shiftKey) {
          // Unindent line
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          if (value.substring(lineStart, lineStart + 2) === tabSpaces) {
            const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
            onChange(newValue);
            setTimeout(() => {
              textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
            }, 0);
          }
        } else {
          // Insert tab spaces
          const newValue = value.substring(0, start) + tabSpaces + value.substring(end);
          onChange(newValue);
          setTimeout(() => {
            const newPos = start + 2;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
        return;
      }

      // Auto-closing quotes and brackets
      const pairs: Record<string, string> = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`',
      };

      if (pairs[e.key]) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.substring(start, end);

        if (selected.length > 0) {
          e.preventDefault();
          const replacement = `${e.key}${selected}${pairs[e.key]}`;
          const newValue = value.substring(0, start) + replacement + value.substring(end);
          onChange(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(start + 1, end + 1);
          }, 0);
          return;
        }
      }
    };

    const handleScrollInternal = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      if (onScroll) {
        onScroll(e);
      }
    };

    const fontClass =
      fontFamily === 'serif'
        ? 'font-serif'
        : fontFamily === 'sans'
        ? 'font-sans'
        : 'font-mono';

    return (
      <div className="relative flex h-full w-full overflow-hidden bg-white text-slate-900">
        {lineNumbers && (
          <div
            ref={lineNumbersRef}
            aria-hidden="true"
            className="select-none overflow-hidden py-6 pl-3 pr-2 text-right font-mono text-slate-400 bg-slate-50 border-r border-slate-200 transition-colors"
            style={{
              fontSize: `${Math.max(12, fontSize - 2)}px`,
              lineHeight: 1.6,
              width: `${Math.max(42, String(linesCount).length * 10 + 20)}px`,
            }}
          >
            {Array.from({ length: linesCount }, (_, i) => (
              <div
                key={i + 1}
                className={`leading-relaxed font-medium ${
                  wordWrap ? 'opacity-80' : i + 1 === currentLine ? 'opacity-100 text-indigo-500 font-bold' : 'opacity-80'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <div className="relative flex-1 min-w-0 h-full">
          {/* Current-line highlight — only accurate without soft wrap, where
              one logical line occupies exactly one visual row. */}
          {!wordWrap && (
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 pointer-events-none bg-indigo-50/60"
              style={{
                top: `${24 + (currentLine - 1) * lineHeight}px`,
                height: `${lineHeight}px`,
              }}
            />
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              syncCurrentLine();
            }}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            onScroll={handleScrollInternal}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder={placeholder || 'Bắt đầu soạn thảo Markdown...'}
            spellCheck={false}
            className={`relative z-10 h-full w-full resize-none p-6 outline-none bg-transparent leading-relaxed text-slate-900 ${fontClass} ${
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
            } placeholder-slate-400 selection:bg-indigo-100 selection:text-indigo-900`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.6,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
