'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';

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
  const [isMobile, setIsMobile] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    htmlContent: '',
    fieldsSchema: {}
  });
  const { isDark } = useDarkMode();
  const router = useRouter();

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
        alert('Template created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({
      title: template.title,
      htmlContent: template.htmlContent,
      fieldsSchema: template.fieldsSchema || {}
    });
    setShowAddForm(true);
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
        alert('Template updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingTemplate(null);
    setNewTemplate({ title: '', htmlContent: '', fieldsSchema: {} });
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/admin/agreements?templateId=${templateId}`);
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#ffffff';

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px', 
      backgroundColor: mainBg, 
      minHeight: '100vh', 
      color: textColor 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '24px',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : '0'
      }}>
        <div>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: isMobile ? '24px' : '32px', 
            color: textColor, 
            fontWeight: 'bold' 
          }}>
            {isMobile ? 'Templates' : 'Photobooth Guys - Templates'}
          </h1>
          <p style={{ margin: 0, color: mutedText, fontSize: '16px' }}>
            Create and manage agreement templates
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
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: isMobile ? '12px 16px' : '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            title="View all available smart fields for templates"
          >
            <span>🔧</span>
            {showSmartFields ? 'Hide' : 'Show'} Smart Fields
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              padding: isMobile ? '12px 16px' : '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '500',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            title="Create a new agreement template"
          >
            + Add Template
          </button>
        </div>
      </div>

      {/* Smart Fields Panel */}
      {showSmartFields && (
        <div style={{
          backgroundColor: cardBg,
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`,
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor, fontWeight: 'bold' }}>Available Smart Fields</h2>
          <p style={{ margin: '0 0 20px 0', color: mutedText, fontSize: '16px' }}>
            Use these fields in your templates to automatically populate client and event information.
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '12px' 
          }}>
            {[
              { field: '{{client.firstName}}', description: 'Client first name', example: 'John' },
              { field: '{{client.lastName}}', description: 'Client last name', example: 'Smith' },
              { field: '{{client.email}}', description: 'Client email address', example: 'john@example.com' },
              { field: '{{client.phone}}', description: 'Client phone number', example: '(555) 123-4567' },
              { field: '{{client.eventDate}}', description: 'Event date', example: '2024-06-15' },
              { field: '{{event.type}}', description: 'Type of event', example: 'Wedding Photography' },
              { field: '{{event.location}}', description: 'Event location', example: 'Grand Ballroom' },
              { field: '{{event.startTime}}', description: 'Event start time', example: '2:00 PM' },
              { field: '{{event.duration}}', description: 'Event duration', example: '8 hours' },
              { field: '{{event.package}}', description: 'Package selected', example: 'Premium Package' },
              { field: '{{pricing.basePrice}}', description: 'Base package price', example: '$2,500' },
              { field: '{{pricing.additionalHours}}', description: 'Additional hours rate', example: '$300/hour' },
              { field: '{{pricing.total}}', description: 'Total price', example: '$2,500' },
            ].map((field, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <code style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {field.field}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(field.field)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: mutedText
                    }}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: mutedText }}>{field.description}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                  Example: {field.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={{
          backgroundColor: cardBg,
          padding: isMobile ? '16px' : '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`,
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>
            {editingTemplate ? 'Edit Template' : 'Add New Template'}
          </h2>
          <form onSubmit={editingTemplate ? handleUpdateTemplate : handleAddTemplate}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                Template Title *
              </label>
              <input
                type="text"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                required
                placeholder="e.g., Wedding Photography Agreement"
                title="A descriptive name for your template"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                HTML Content *
              </label>
              <textarea
                value={newTemplate.htmlContent}
                onChange={(e) => setNewTemplate({ ...newTemplate, htmlContent: e.target.value })}
                required
                rows={10}
                placeholder="Enter your HTML template content here. Use {{fieldName}} for dynamic fields."
                title="HTML content with smart fields like {{client.firstName}}"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
              />
              <p style={{ margin: '8px 0 0 0', color: mutedText, fontSize: '14px' }}>
                Use smart fields like {`{{client.firstName}}`}, {`{{client.lastName}}`}, {`{{eventDate}}`} etc.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                Fields Schema (JSON)
              </label>
              <textarea
                value={JSON.stringify(newTemplate.fieldsSchema, null, 2)}
                onChange={(e) => {
                  try {
                    setNewTemplate({ ...newTemplate, fieldsSchema: JSON.parse(e.target.value) });
                  } catch (err) {
                    // Invalid JSON, keep the text but don't update the object
                  }
                }}
                rows={6}
                placeholder='{"client.firstName": {"type": "text", "required": true, "editableByClient": false}}'
                title="Define field types, requirements, and permissions (optional)"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
              />
              <p style={{ margin: '8px 0 0 0', color: mutedText, fontSize: '14px' }}>
                Define field types, requirements, and permissions. Leave empty for now.
              </p>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '12px 16px' : '12px 24px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '500',
                  width: isMobile ? '100%' : 'auto'
                }}
                title="Save the new template"
              >
                {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Add Template')}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '12px 16px' : '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '500',
                  width: isMobile ? '100%' : 'auto'
                }}
                title={editingTemplate ? "Cancel editing template" : "Cancel creating template"}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div style={{ 
        backgroundColor: cardBg, 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`,
        padding: isMobile ? '16px' : '24px'
      }}>
        {templates.length === 0 ? (
          <p style={{ color: mutedText, fontSize: '16px', textAlign: 'center' }}>No templates yet. Create your first template to get started.</p>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>
              Templates ({templates.length})
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {templates.map((template) => (
                <div key={template.id} style={{
                  padding: '16px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc'
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
                      Created {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
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
                        width: isMobile ? '100%' : 'auto'
                      }}
                      title="Use this template to create an agreement"
                    >
                      Use This Template
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      style={{
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        padding: isMobile ? '10px 16px' : '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        width: isMobile ? '100%' : 'auto'
                      }}
                      title="Edit template details"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}