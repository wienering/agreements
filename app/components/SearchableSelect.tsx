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
          border: `1px solid ${style?.borderColor || '#d1d5db'}`,
          borderRadius: '4px',
          backgroundColor: style?.backgroundColor || '#ffffff',
          color: style?.color || '#1f2937',
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
          color: value ? (style?.color || '#1f2937') : '#9ca3af',
          fontSize: '14px'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ 
          fontSize: '12px',
          color: '#6b7280',
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
          backgroundColor: style?.backgroundColor || '#ffffff',
          border: `1px solid ${style?.borderColor || '#d1d5db'}`,
          borderRadius: '4px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                border: `1px solid ${style?.borderColor || '#d1d5db'}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: style?.backgroundColor || '#ffffff',
                color: style?.color || '#1f2937'
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
                    color: style?.color || '#1f2937',
                    backgroundColor: value === option.value ? '#f3f4f6' : 'transparent',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
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
                color: '#6b7280',
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
