'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import { adminHeaderAddButton } from '../../lib/adminTheme';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import RichTextEditor, { RichTextPreview } from '../../components/RichTextEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  AgreementTemplate,
  SmartFieldItem,
  SortableTemplateItem,
} from './TemplatePageParts';

export default function TemplatesPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Templates | Admin | Photobooth Guys';
  }, []);

  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<AgreementTemplate | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    internalTitle: '',
    htmlContent: '',
    fieldsSchema: {}
  });
  const { isDark } = useDarkMode();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = templates.findIndex((template) => template.id === active.id);
      const newIndex = templates.findIndex((template) => template.id === over?.id);

      const newTemplates = arrayMove(templates, oldIndex, newIndex);
      setTemplates(newTemplates);

      // Update order in database
      try {
        const templateIds = newTemplates.map(template => template.id);
        await fetch('/api/templates/reorder', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ templateIds }),
        });
        showToast('Templates reordered successfully!');
      } catch (error) {
        console.error('Error reordering templates:', error);
        showToast('Failed to save new order', 'error');
        // Revert the change
        fetchTemplates();
      }
    }
  };

  // Toggle preview expansion
  const togglePreview = (templateId: string) => {
    setExpandedPreviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Copy smart field to clipboard
  const copyToClipboard = async (field: string) => {
    try {
      await navigator.clipboard.writeText(field);
      setCopiedField(field);
      showToast(`${field} copied to clipboard!`, 'success');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  useLockBodyScroll(showAddForm || viewingTemplate !== null);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        const createdTemplate = await response.json();
        setTemplates([createdTemplate, ...templates]);
        setShowAddForm(false);
        setNewTemplate({ title: '', internalTitle: '', htmlContent: '', fieldsSchema: {} });
        showToast('Template created successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      showToast('Failed to create template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setLoading(true);
    
    try {
      const response = await fetch(`/api/templates/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newTemplate, id: editingTemplate.id }),
      });

      if (response.ok) {
        const updatedTemplate = await response.json();
        setTemplates(templates.map(t => t.id === editingTemplate.id ? updatedTemplate : t));
        setShowAddForm(false);
        setEditingTemplate(null);
        setNewTemplate({ title: '', internalTitle: '', htmlContent: '', fieldsSchema: {} });
        showToast('Template updated successfully!');
      } else {
        const error = await response.json();
        console.error('Template update error:', error);
        showToast(`Error: ${error.error || 'Unknown error occurred'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      showToast('Failed to update template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingTemplate(null);
    setNewTemplate({ title: '', internalTitle: '', htmlContent: '', fieldsSchema: {} });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/templates/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: templateId }),
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        showToast('Template deleted successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to delete template'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/admin/agreements?templateId=${templateId}`);
  };

  const handleEditTemplate = (template: AgreementTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      title: template.title,
      internalTitle: template.internalTitle || '',
      htmlContent: template.htmlContent,
      fieldsSchema: template.fieldsSchema as object
    });
    setShowAddForm(true);
  };

  const handleViewTemplate = (template: AgreementTemplate) => {
    setViewingTemplate(template);
  };

  const handleCloseViewModal = () => {
    setViewingTemplate(null);
  };

  const mainBg = isDark ? '#080c08' : '#f8fafc';
  const cardBg = isDark ? '#1a1d1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const mutedText = isDark ? '#8f9a8f' : '#64748b';
  const borderColor = isDark ? '#2d3530' : '#e2e8f0';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: isMobile ? '16px' : '24px'
    }}>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <ToastContainer />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '0'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: isMobile ? '24px' : '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Templates
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage agreement templates
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={() => setShowSmartFields(!showSmartFields)}
              style={{
                backgroundColor: showSmartFields ? '#3d8560' : '#6b7280',
                color: 'white',
                border: 'none',
                padding: isMobile ? '12px 20px' : '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: isMobile ? '100%' : 'auto'
              }}
              title="Show available smart fields"
            >
              {showSmartFields ? 'Hide Smart Fields' : 'Show Smart Fields'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                backgroundColor: adminHeaderAddButton.bg,
                color: 'white',
                border: 'none',
                padding: isMobile ? '12px 20px' : '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: isMobile ? '100%' : 'auto',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = adminHeaderAddButton.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = adminHeaderAddButton.bg;
              }}
              title="Create a new template"
            >
              + New Template
            </button>
          </div>
        </div>

        {/* Smart Fields Help */}
        {showSmartFields && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: textColor }}>
              Available Smart Fields
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px' 
            }}>
              {([
                '{{client.firstName}}',
                '{{client.lastName}}',
                '{{client.fullName}}',
                '{{client.email}}',
                '{{client.phone}}',
                '{{client.eventDate}}',
                '{{client.notes}}',
                '{{clients.fullNames}}',
                '{{clients.firstNames}}',
                '{{clients.lastNames}}',
                '{{secondSigner.firstName}}',
                '{{secondSigner.lastName}}',
                '{{secondSigner.fullName}}',
                '{{secondSigner.email}}',
                '{{secondSigner.phone}}',
                '{{event.type}}',
                '{{event.location}}',
                '{{event.startTime}}',
                '{{event.duration}}',
                '{{event.package}}',
                '{{event.price}}',
                '{{agreement.date}}',
                '{{agreement.id}}',
              ] as const).map((field) => (
                <SmartFieldItem
                  key={field}
                  field={field}
                  isDark={isDark}
                  textColor={textColor}
                  isCopied={copiedField === field}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '14px',
              color: mutedText
            }}>
              Use these smart fields in your template content. They will be automatically replaced with actual client data when creating agreements.
              When an agreement has a second signer, <code>{'{{client.firstName}} {{client.lastName}}'}</code> auto-expands to include both names
              (e.g. &quot;Alice Smith and Bob Jones&quot;), and the <code>{'{{secondSigner.*}}'}</code> tokens render the second signer&apos;s details.
              Use <code>{'{{clients.fullNames}}'}</code> for an explicit &quot;both signers&quot; rendering that always works.
            </p>
          </div>
        )}

        {/* Add/Edit Form — viewport modal */}
        {showAddForm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '12px' : '20px',
              overflowY: 'auto',
            }}
            onClick={handleCancelEdit}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '24px',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: 'min(90vh, 100%)',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <form onSubmit={editingTemplate ? handleUpdateTemplate : handleAddTemplate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  Title (shown to clients)
                </label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '14px'
                  }}
                  placeholder="Enter template title (this will be shown to clients)"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  Internal Title (for organization only)
                </label>
                <input
                  type="text"
                  value={newTemplate.internalTitle || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, internalTitle: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '14px'
                  }}
                  placeholder="Enter internal title (e.g., 'Photobooth Guys Agreement - UP')"
                />
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: '12px', 
                  color: mutedText 
                }}>
                  This is only visible to you for organizing templates. Clients will only see the title above.
                </p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  Content
                </label>
                <RichTextEditor
                  value={newTemplate.htmlContent}
                  onChange={(value) => setNewTemplate({ ...newTemplate, htmlContent: value })}
                  placeholder="Enter template content with smart fields..."
                  style={{
                    backgroundColor: cardBg,
                    color: textColor,
                    borderColor: borderColor
                  }}
                />
              </div>
              
              {/* Preview */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  Preview
                </label>
                <RichTextPreview 
                  html={newTemplate.htmlContent || '<p>Enter content above to see preview...</p>'}
                  isDark={isDark}
                  style={{
                    backgroundColor: isDark ? '#080c08' : '#f8fafc',
                    borderColor: borderColor
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                    e.currentTarget.style.color = textColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = mutedText;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#4a9e72',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#3d8560';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#4a9e72';
                    }
                  }}
                >
                  {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Templates List */}
        {templates.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              No templates found. Create your first template to get started.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={templates.map(template => template.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'grid', gap: '16px' }}>
                {templates.map(template => (
                  <SortableTemplateItem 
                    key={template.id} 
                    template={template} 
                    isExpanded={expandedPreviews.has(template.id)}
                    onTogglePreview={togglePreview}
                    isMobile={isMobile}
                    isDark={isDark}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textColor={textColor}
                    mutedText={mutedText}
                    loading={loading}
                    onView={handleViewTemplate}
                    onUseTemplate={handleUseTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* View/Edit Template Modal */}
        {viewingTemplate && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              width: '100%',
              maxWidth: '1200px',
              maxHeight: '95vh',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '20px', 
                    color: textColor, 
                    fontWeight: '600' 
                  }}>
                    {viewingTemplate.title}
                  </h2>
                  <p style={{ 
                    margin: '0', 
                    color: mutedText, 
                    fontSize: '14px' 
                  }}>
                    Version {viewingTemplate.version} • {viewingTemplate.htmlContent.length} characters
                  </p>
                </div>
                <button
                  onClick={handleCloseViewModal}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: mutedText,
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close modal"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: '20px',
                overflow: 'auto',
                flex: 1
              }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: isDark ? '#080c08' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`
                }}>
                  <RichTextPreview 
                    html={viewingTemplate.htmlContent}
                    isDark={isDark}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: '0',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '20px',
                borderTop: `1px solid ${borderColor}`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleCloseViewModal}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                    e.currentTarget.style.color = textColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = mutedText;
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEditTemplate(viewingTemplate);
                    handleCloseViewModal();
                  }}
                  style={{
                    backgroundColor: '#3d8560',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3d8560';
                  }}
                >
                  Edit Template
                </button>
                <button
                  onClick={() => {
                    handleUseTemplate(viewingTemplate.id);
                    handleCloseViewModal();
                  }}
                  style={{
                    backgroundColor: '#4a9e72',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3d8560';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#4a9e72';
                  }}
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








