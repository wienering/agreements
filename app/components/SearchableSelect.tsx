'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  options: Array<{ id: string; label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  required?: boolean;
}

const ADMIN_BORDER = 'var(--admin-hairline)';
const ADMIN_BG = 'var(--admin-bg)';
const ADMIN_TEXT = 'var(--admin-text)';
const ADMIN_MUTED = 'var(--admin-muted)';
const ADMIN_RAISED = 'var(--admin-surface-raised)';
const INK = 'var(--accent-on)';

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Search and select...",
  style,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  useEffect(() => {
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: { id: string; label: string; value: string }) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected value display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: `1px solid ${style?.borderColor || ADMIN_BORDER}`,
          borderRadius: '2px',
          backgroundColor: style?.backgroundColor || ADMIN_BG,
          color: style?.color || ADMIN_TEXT,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '36px',
          ...style
        }}
      >
        <span style={{ 
          color: value ? (style?.color || ADMIN_TEXT) : ADMIN_MUTED,
          fontSize: '14px'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ 
          fontSize: '12px',
          color: ADMIN_MUTED,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: style?.backgroundColor || ADMIN_BG,
          border: `1px solid ${style?.borderColor || ADMIN_BORDER}`,
          borderRadius: '2px',
          boxShadow: 'none',
          zIndex: 1000,
          maxHeight: '200px',
          overflow: 'hidden'
        }}>
          {/* Search input */}
          <div style={{ padding: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              style={{
                width: '100%',
                padding: '6px 8px',
                border: `1px solid ${style?.borderColor || ADMIN_BORDER}`,
                borderRadius: '2px',
                fontSize: '14px',
                backgroundColor: style?.backgroundColor || ADMIN_BG,
                color: style?.color || ADMIN_TEXT
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: style?.color || ADMIN_TEXT,
                    backgroundColor: value === option.value ? ADMIN_RAISED : 'transparent',
                    borderBottom: `1px solid ${ADMIN_BORDER}`
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--accent-wash)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = style?.color || ADMIN_TEXT;
                    }
                  }}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div style={{
                padding: '8px 12px',
                fontSize: '14px',
                color: ADMIN_MUTED,
                textAlign: 'center'
              }}>
                No clients found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
