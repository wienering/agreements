'use client';

import { RichTextPreview } from '../../components/RichTextEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface AgreementTemplate {
  id: string;
  title: string;
  internalTitle?: string | null;
  htmlContent: string;
  fieldsSchema: unknown;
  version: number;
  order: number;
  createdAt: string;
}

export function SmartFieldItem({
  field,
  isDark,
  textColor,
  isCopied,
  onCopy,
}: {
  field: string;
  isDark: boolean;
  textColor: string;
  isCopied: boolean;
  onCopy: (field: string) => void;
}) {
  return (
    <div
      onClick={() => onCopy(field)}
      style={{
        padding: '8px 12px',
        backgroundColor: isDark ? '#080c08' : '#f8fafc',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        color: textColor,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        border: isCopied ? '2px solid #4a9e72' : '2px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? '#1a1d1a' : '#f1f5f9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? '#080c08' : '#f8fafc';
      }}
      title="Click to copy to clipboard"
    >
      <span>{field}</span>
      {isCopied && (
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#4a9e72',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '8px',
            animation: 'pulse 0.5s ease-in-out',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 20 20" fill="white">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export function SortableTemplateItem({
  template,
  isExpanded,
  onTogglePreview,
  isMobile,
  isDark,
  cardBg,
  borderColor,
  textColor,
  mutedText,
  loading,
  onView,
  onUseTemplate,
  onDelete,
}: {
  template: AgreementTemplate;
  isExpanded: boolean;
  onTogglePreview: (templateId: string) => void;
  isMobile: boolean;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedText: string;
  loading: boolean;
  onView: (template: AgreementTemplate) => void;
  onUseTemplate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '20px',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.borderColor = isDark ? '#4b5563' : '#cbd5e1';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.borderColor = borderColor;
        }
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: isDark ? '#8f9a8f' : '#64748b',
          backgroundColor: isDark ? '#374151' : '#f1f5f9',
          borderRadius: '4px',
          border: `1px solid ${borderColor}`,
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e2e8f0';
          e.currentTarget.style.color = isDark ? '#ffffff' : '#1e293b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f1f5f9';
          e.currentTarget.style.color = isDark ? '#8f9a8f' : '#64748b';
        }}
        title="Drag to reorder"
      >
        ⋮⋮
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '12px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '8px' : '0',
          paddingRight: '30px',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
            {template.internalTitle || template.title}
          </h3>
          {template.internalTitle && (
            <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '12px', fontStyle: 'italic' }}>
              Client Title: {template.title}
            </p>
          )}
          <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
            Version {template.version}
          </p>
          <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
            {template.htmlContent.length} characters
          </p>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: mutedText,
            backgroundColor: isDark ? '#1a1d1a' : '#f1f5f9',
            padding: '4px 8px',
            borderRadius: '4px',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}
        >
          Created{' '}
          {new Date(template.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
        </span>
      </div>

      <div
        style={{
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: isDark ? '#080c08' : '#f8fafc',
          borderRadius: '6px',
          border: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ fontSize: '12px', color: mutedText, marginBottom: '8px', fontWeight: '500' }}>
          Preview:
        </div>
        <RichTextPreview
          html={
            isExpanded
              ? template.htmlContent
              : template.htmlContent.substring(0, 200) + (template.htmlContent.length > 200 ? '...' : '')
          }
          isDark={isDark}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            padding: '0',
            fontSize: '14px',
            lineHeight: '1.4',
          }}
        />
        {template.htmlContent.length > 200 && (
          <button
            type="button"
            onClick={() => onTogglePreview(template.id)}
            style={{
              backgroundColor: 'transparent',
              color: isDark ? '#82a894' : '#4a9e72',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              textDecoration: 'underline',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#9cb8aa' : '#3d8560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#82a894' : '#4a9e72';
            }}
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            ) : (
              <>
                <span>Show More</span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
        <button
          type="button"
          onClick={() => onView(template)}
          style={{
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            padding: isMobile ? '10px 16px' : '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            width: isMobile ? '100%' : 'auto',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6d28d9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
          title="View full template content"
        >
          View/Edit
        </button>
        <button
          type="button"
          onClick={() => onUseTemplate(template.id)}
          style={{
            backgroundColor: '#4a9e72',
            color: 'white',
            border: 'none',
            padding: isMobile ? '10px 16px' : '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            width: isMobile ? '100%' : 'auto',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3d8560';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4a9e72';
          }}
          title="Use this template to create an agreement"
        >
          Use Template
        </button>
        <button
          type="button"
          onClick={() => onDelete(template.id)}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#9ca3af' : '#dc2626',
            color: 'white',
            border: 'none',
            padding: isMobile ? '10px 16px' : '8px 16px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            width: isMobile ? '100%' : 'auto',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }
          }}
          title="Delete this template permanently"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
