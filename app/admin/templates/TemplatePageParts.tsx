'use client';

import { RichTextPreview } from '../../components/RichTextEditor';
import { formatDateToronto } from '@/lib/dates';
import { AdminButton } from '../../components/AdminButton';
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
  textColor,
  isCopied,
  onCopy,
}: {
  field: string;
  textColor: string;
  isCopied: boolean;
  onCopy: (field: string) => void;
}) {
  return (
    <div
      onClick={() => onCopy(field)}
      style={{
        padding: '8px 12px',
        backgroundColor: 'var(--admin-bg)',
        borderRadius: '2px',
        fontSize: '14px',
        fontFamily: 'monospace',
        color: textColor,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        border: isCopied ? '2px solid var(--accent)' : '2px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--admin-surface)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--admin-bg)';
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
            backgroundColor: 'var(--accent)',
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
        backgroundColor: isDragging ? 'var(--accent-wash)' : cardBg,
        border: `1px solid ${isDragging ? 'var(--accent)' : borderColor}`,
        borderRadius: '2px',
        padding: '20px',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--accent)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
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
          color: 'var(--admin-muted)',
          backgroundColor: 'var(--admin-surface-raised)',
          borderRadius: '2px',
          border: `1px solid ${borderColor}`,
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--admin-hairline)';
          e.currentTarget.style.color = 'var(--admin-text)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--admin-surface-raised)';
          e.currentTarget.style.color = 'var(--admin-muted)';
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
            backgroundColor: 'var(--admin-surface)',
            padding: '4px 8px',
            borderRadius: '2px',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}
        >
          Created{' '}
          {formatDateToronto(template.createdAt)}
        </span>
      </div>

      <div
        style={{
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: 'var(--admin-bg)',
          borderRadius: '2px',
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
              color: 'var(--accent)',
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
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
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
        <AdminButton
          variant="ghost"
          fullWidth={isMobile}
          onClick={() => onView(template)}
          title="View full template content"
        >
          View/Edit
        </AdminButton>
        <AdminButton
          variant="primary"
          fullWidth={isMobile}
          onClick={() => onUseTemplate(template.id)}
          title="Use this template to create an agreement"
        >
          Use Template
        </AdminButton>
        <AdminButton
          variant="danger"
          fullWidth={isMobile}
          onClick={() => onDelete(template.id)}
          disabled={loading}
          title="Delete this template permanently"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </AdminButton>
      </div>
    </div>
  );
}
