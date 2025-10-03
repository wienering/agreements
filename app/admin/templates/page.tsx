'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import RichTextEditor, { RichTextPreview } from '../../components/RichTextEditor';

interface Template {
  id: string;
  title: string;
  htmlContent: string;
  fieldsSchema: any;
  version: number;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    htmlContent: '',
    fieldsSchema: {}
  });
  const { isDark } = useDarkMode();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

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
        setNewTemplate({ title: '', htmlContent: '', fieldsSchema: {} });
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
        setNewTemplate({ title: '', htmlContent: '', fieldsSchema: {} });
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
    setNewTemplate({ title: '', htmlContent: '', fieldsSchema: {} });
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

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({
      title: template.title,
      htmlContent: template.htmlContent,
      fieldsSchema: template.fieldsSchema
    });
    setShowAddForm(true);
  };

  const handleViewTemplate = (template: Template) => {
    setViewingTemplate(template);
  };

  const handleCloseViewModal = () => {
    setViewingTemplate(null);
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: isMobile ? '16px' : '24px'
    }}>
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
                backgroundColor: showSmartFields ? '#059669' : '#6b7280',
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: isMobile ? '12px 20px' : '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: isMobile ? '100%' : 'auto'
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
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.firstName}}`}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.lastName}}`}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.email}}`}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.phone}}`}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.eventDate}}`}
              </div>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: textColor
              }}>
                {`{{client.notes}}`}
              </div>
            </div>
            <p style={{ 
              margin: '12px 0 0 0', 
              fontSize: '14px', 
              color: mutedText 
            }}>
              Use these smart fields in your template content. They will be automatically replaced with actual client data when creating agreements.
            </p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
          }}>
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
                  Title
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
                  placeholder="Enter template title"
                />
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
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
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
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
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
          <div style={{ display: 'grid', gap: '16px' }}>
            {templates.map(template => (
              <div key={template.id} style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start', 
                  marginBottom: '12px',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '8px' : '0'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                      {template.title}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      Version {template.version}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {template.htmlContent.length} characters
                    </p>
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    color: mutedText,
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    alignSelf: isMobile ? 'flex-start' : 'auto'
                  }}>
                    Created {new Date(template.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                  </span>
                </div>
                
                {/* Template Preview - Small */}
                <div style={{ 
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                  maxHeight: '120px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: mutedText, 
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Preview:
                  </div>
                  <RichTextPreview 
                    html={template.htmlContent}
                    isDark={isDark}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: '0',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}
                  />
                  {/* Fade overlay at bottom */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '30px',
                    background: `linear-gradient(transparent, ${isDark ? '#0f172a' : '#f8fafc'})`,
                    pointerEvents: 'none'
                  }}></div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => handleViewTemplate(template)}
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
                      transition: 'background-color 0.2s'
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
                    onClick={() => handleUseTemplate(template.id)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '10px 16px' : '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      width: isMobile ? '100%' : 'auto',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                    title="Use this template to create an agreement"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
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
                      transition: 'background-color 0.2s'
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
            ))}
          </div>
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
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'hidden',
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
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                  minHeight: '400px'
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
                    backgroundColor: '#059669',
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
                    e.currentTarget.style.backgroundColor = '#059669';
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
                    backgroundColor: '#3b82f6',
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
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
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
