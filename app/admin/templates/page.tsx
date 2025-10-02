'use client';

import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    htmlContent: '',
    fieldsSchema: {}
  });

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

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#0f172a', fontWeight: 'bold' }}>
            Photobooth Guys - Templates
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
            Create and manage agreement templates
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          style={{
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          title="Create a new agreement template"
        >
          + Add Template
        </button>
      </div>

      {showAddForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>Add New Template</h2>
          <form onSubmit={handleAddTemplate}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
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
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
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
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  backgroundColor: 'white'
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Use smart fields like {`{{client.firstName}}`}, {`{{client.lastName}}`}, {`{{eventDate}}`} etc.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
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
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  backgroundColor: 'white'
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Define field types, requirements, and permissions. Leave empty for now.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                title="Save the new template"
              >
                {loading ? 'Creating...' : 'Add Template'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                title="Cancel creating template"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        padding: '24px'
      }}>
        {templates.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '16px', textAlign: 'center' }}>No templates yet. Create your first template to get started.</p>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>
              Templates ({templates.length})
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {templates.map((template) => (
                <div key={template.id} style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>
                        {template.title}
                      </h3>
                      <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '14px' }}>
                        Version {template.version}
                      </p>
                      <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '14px' }}>
                        {template.htmlContent.length} characters
                      </p>
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af',
                      backgroundColor: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      Created {new Date(template.createdAt).toLocaleDateString()}
                    </span>
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