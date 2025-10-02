'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function RichTextEditor({ value, onChange, placeholder, style }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Convert HTML to plain text for editing
  const htmlToPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Convert plain text to HTML for storage
  const plainTextToHtml = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim() === '' ? '<br>' : line)
      .join('\n')
      .replace(/\n/g, '<br>');
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const plainText = e.target.value;
    const html = plainTextToHtml(plainText);
    onChange(html);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key for line breaks
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // Insert line break at cursor position
      const newText = text.substring(0, start) + '\n' + text.substring(end);
      const html = plainTextToHtml(newText);
      onChange(html);
      
      // Update textarea value and cursor position
      textarea.value = newText;
      const newCursorPos = start + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // Insert pasted text at cursor position
    const newText = text.substring(0, start) + pastedText + text.substring(end);
    const html = plainTextToHtml(newText);
    onChange(html);
    
    // Update textarea value and cursor position
    textarea.value = newText;
    const newCursorPos = start + pastedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  };

  // Convert HTML to plain text for display
  const displayValue = htmlToPlainText(value);

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '12px',
          border: `1px solid ${isFocused ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.2s',
          ...style
        }}
      />
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        fontSize: '12px',
        color: '#6b7280',
        pointerEvents: 'none'
      }}>
        Press Enter for new lines
      </div>
    </div>
  );
}

// Preview component to show how the HTML will render
export function RichTextPreview({ html, style }: { html: string; style?: React.CSSProperties }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: '#f9fafb',
        fontFamily: 'Georgia, serif',
        lineHeight: '1.6',
        fontSize: '16px',
        color: '#1f2937',
        minHeight: '100px',
        ...style
      }}
    />
  );
}
