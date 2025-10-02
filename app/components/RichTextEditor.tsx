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
  const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    // Convert <br> tags to newlines
    return html.replace(/<br\s*\/?>/gi, '\n');
  };

  // Convert plain text to HTML for storage
  const plainTextToHtml = (text: string): string => {
    if (!text) return '';
    // Convert newlines to <br> tags
    return text.replace(/\n/g, '<br>');
  };

  // Get the current plain text value
  const getPlainTextValue = (): string => {
    return htmlToPlainText(value);
  };

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const plainText = e.target.value;
    const html = plainTextToHtml(plainText);
    onChange(html);
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Enter key to create new lines
    if (e.key === 'Enter') {
      // Let the default behavior happen (creates newline)
      return;
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selectionStart = textareaRef.current?.selectionStart || 0;
    const selectionEnd = textareaRef.current?.selectionEnd || 0;
    const currentValue = getPlainTextValue();
    
    const newValue = currentValue.substring(0, selectionStart) + text + currentValue.substring(selectionEnd);
    const html = plainTextToHtml(newValue);
    onChange(html);
    
    // Set cursor position after pasted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = selectionStart + text.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={getPlainTextValue()}
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
          whiteSpace: 'pre-wrap',
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
export function RichTextPreview({ 
  html, 
  style, 
  clientData, 
  agreementId,
  isDark = false 
}: { 
  html: string; 
  style?: React.CSSProperties;
  clientData?: any;
  agreementId?: string;
  isDark?: boolean;
}) {
  // Replace smart fields with actual data or sample data for better readability
  const processPreviewHtml = (html: string) => {
    if (!html) return '';
    
    let processedHtml = html;
    
    // Use actual client data if available, otherwise use sample data
    const firstName = clientData?.firstName || 'John';
    const lastName = clientData?.lastName || 'Smith';
    const email = clientData?.email || 'john@example.com';
    const phone = clientData?.phone || '(555) 123-4567';
    const eventDate = clientData?.eventDate ? new Date(clientData.eventDate).toLocaleDateString() : '12/25/2024';
    const notes = clientData?.notes || 'Special requests';
    const eventType = clientData?.eventType || 'Wedding';
    const eventLocation = clientData?.eventLocation || 'Grand Ballroom';
    const eventStartTime = clientData?.eventStartTime || '2:00 PM';
    const eventDuration = clientData?.eventDuration || '4 hours';
    const eventPackage = clientData?.eventPackage || 'Premium Package';
    
    // Replace client fields with actual or sample data
    processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${firstName}]</span>`);
    processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${lastName}]</span>`);
    processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${email}]</span>`);
    processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${phone}]</span>`);
    processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventDate}]</span>`);
    processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${notes}]</span>`);
    
    // Replace event fields with actual or sample data
    processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, `<span style="background-color: #dbeafe; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventType}]</span>`);
    processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, `<span style="background-color: #dbeafe; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventLocation}]</span>`);
    processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, `<span style="background-color: #dbeafe; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventStartTime}]</span>`);
    processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, `<span style="background-color: #dbeafe; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventDuration}]</span>`);
    processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, `<span style="background-color: #dbeafe; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${eventPackage}]</span>`);
    
    // Replace agreement fields with actual or sample data
    const agreementDate = new Date().toLocaleDateString();
    const agreementIdValue = agreementId || 'AG-12345';
    processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, `<span style="background-color: #f3e8ff; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${agreementDate}]</span>`);
    processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, `<span style="background-color: #f3e8ff; padding: 2px 4px; border-radius: 3px; font-weight: 500;">[${agreementIdValue}]</span>`);
    
    return processedHtml;
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: processPreviewHtml(html) }}
      style={{
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: isDark ? '#1e293b' : '#f9fafb',
        fontFamily: 'Georgia, serif',
        lineHeight: '1.6',
        fontSize: '16px',
        color: isDark ? '#f1f5f9' : '#1f2937',
        minHeight: '100px',
        ...style
      }}
    />
  );
}