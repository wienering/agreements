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
          border: `1px solid ${isFocused ? 'var(--accent)' : '#d1d5db'}`,
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
  eventData,
  secondSigner,
  isDark = false
}: {
  html: string;
  style?: React.CSSProperties;
  clientData?: any;
  agreementId?: string;
  eventData?: any;
  secondSigner?: { enabled?: boolean; firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  isDark?: boolean;
}) {
  // Replace smart fields with actual data, showing nothing for blank fields
  const processPreviewHtml = (html: string) => {
    if (!html) return '';

    let processedHtml = html;

    // Use actual client data if available, otherwise show empty string
    const firstName = clientData?.firstName || '';
    const lastName = clientData?.lastName || '';
    const email = clientData?.email || '';
    const phone = clientData?.phone || '';
    const notes = clientData?.notes || '';

    // Second-signer values (empty when not enabled).
    const secondEnabled = Boolean(secondSigner && secondSigner.enabled);
    const sFirst = secondEnabled ? (secondSigner?.firstName || '') : '';
    const sLast = secondEnabled ? (secondSigner?.lastName || '') : '';
    const sEmail = secondEnabled ? (secondSigner?.email || '') : '';
    const sPhone = secondEnabled ? (secondSigner?.phone || '') : '';

    const pFull = `${firstName} ${lastName}`.trim();
    const sFull = `${sFirst} ${sLast}`.trim();
    const fullNames = secondEnabled && sFull ? `${pFull} and ${sFull}` : pFull;
    const firstNames = secondEnabled && sFirst ? `${firstName} and ${sFirst}` : firstName;
    const lastNames = secondEnabled && sLast ? `${lastName} and ${sLast}` : lastName;

    // Prioritize event data from Event model, fall back to deprecated client fields, show empty if blank
    const eventDate = eventData?.eventDate 
      ? new Date(eventData.eventDate).toLocaleDateString() 
      : (clientData?.eventDate ? new Date(clientData.eventDate).toLocaleDateString() : '');
    const eventType = eventData?.eventType || clientData?.eventType || '';
    const eventLocation = eventData?.eventLocation || clientData?.eventLocation || '';
    const eventStartTime = eventData?.eventStartTime || clientData?.eventStartTime || '';
    const eventDuration = eventData?.eventDuration || clientData?.eventDuration || '';
    const eventPackage = eventData?.eventPackage || clientData?.eventPackage || '';
    const packagePrice = eventData?.packagePrice || clientData?.packagePrice;
    const eventPrice = packagePrice ? `$${typeof packagePrice === 'number' ? packagePrice.toFixed(2) : packagePrice}` : '';

    const clientChip = (value: string) => `<strong style="color: #1f2937; background-color: #f9fafb; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">${value}</strong>`;
    const secondChip = (value: string) => `<strong style="color: #1f2937; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; border: 1px solid #fcd34d;">${value}</strong>`;

    // Combined pattern resolves first so "{{client.firstName}} {{client.lastName}}"
    // renders cleanly as "Alice Smith" or "Alice Smith and Bob Jones".
    processedHtml = processedHtml.replace(
      /\{\{\s*client\.firstName\s*\}\}\s+\{\{\s*client\.lastName\s*\}\}/g,
      clientChip(fullNames),
    );

    // Aggregate / convenience tokens.
    processedHtml = processedHtml.replace(/\{\{\s*client\.fullName\s*\}\}/g, clientChip(pFull));
    processedHtml = processedHtml.replace(/\{\{\s*clients\.fullNames\s*\}\}/g, clientChip(fullNames));
    processedHtml = processedHtml.replace(/\{\{\s*clients\.firstNames\s*\}\}/g, clientChip(firstNames));
    processedHtml = processedHtml.replace(/\{\{\s*clients\.lastNames\s*\}\}/g, clientChip(lastNames));

    // Explicit second-signer tokens (chip stays, value is empty when disabled).
    processedHtml = processedHtml.replace(/\{\{\s*secondSigner\.firstName\s*\}\}/g, secondChip(sFirst));
    processedHtml = processedHtml.replace(/\{\{\s*secondSigner\.lastName\s*\}\}/g, secondChip(sLast));
    processedHtml = processedHtml.replace(/\{\{\s*secondSigner\.fullName\s*\}\}/g, secondChip(sFull));
    processedHtml = processedHtml.replace(/\{\{\s*secondSigner\.email\s*\}\}/g, secondChip(sEmail));
    processedHtml = processedHtml.replace(/\{\{\s*secondSigner\.phone\s*\}\}/g, secondChip(sPhone));

    // Individual primary name tokens — auto-expand to both names when a second signer is enabled.
    processedHtml = processedHtml.replace(/\{\{\s*client\.firstName\s*\}\}/g, clientChip(firstNames));
    processedHtml = processedHtml.replace(/\{\{\s*client\.lastName\s*\}\}/g, clientChip(lastNames));
    processedHtml = processedHtml.replace(/\{\{\s*client\.email\s*\}\}/g, clientChip(email));
    processedHtml = processedHtml.replace(/\{\{\s*client\.phone\s*\}\}/g, clientChip(phone));
    processedHtml = processedHtml.replace(/\{\{\s*client\.eventDate\s*\}\}/g, clientChip(eventDate));
    processedHtml = processedHtml.replace(/\{\{\s*client\.notes\s*\}\}/g, clientChip(notes));
    
    // Replace event fields with clean, readable styling
    processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, `<strong style="color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${eventType}</strong>`);
    processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, `<strong style="color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${eventLocation}</strong>`);
    processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, `<strong style="color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${eventStartTime}</strong>`);
    processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, `<strong style="color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${eventDuration}</strong>`);
    processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, `<strong style="color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${eventPackage}</strong>`);
    processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, `<strong style=""color: #1f2937; background-color: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;"">${eventPrice}</strong>`);
    
    // Replace agreement fields with clean, readable styling
    const agreementDate = new Date().toLocaleDateString();
    const agreementIdValue = agreementId || '';
    processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, `<strong style="color: #1f2937; background-color: #faf5ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d8b4fe;">${agreementDate}</strong>`);
    processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, `<strong style="color: #1f2937; background-color: #faf5ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d8b4fe;">${agreementIdValue}</strong>`);
    
    return processedHtml;
  };

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: isDark ? '#1a1d1a' : '#f9fafb',
        fontFamily: 'Georgia, serif',
        lineHeight: '1.6',
        fontSize: '16px',
        color: isDark ? '#ffffff' : '#1f2937',
        height: '200px', // Fixed height like the text input
        overflowY: 'auto', // Make it scrollable
        whiteSpace: 'pre-wrap', // Preserve line breaks
        ...style
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: processPreviewHtml(html) }}
        style={{
          minHeight: '100%'
        }}
      />
    </div>
  );
}
