'use client';

import { useState } from 'react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    htmlContent: '',
    fieldsSchema: {}
  });

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add template to database
    console.log('Adding template:', newTemplate);
    setShowAddForm(false);
    setNewTemplate({ title: '', htmlContent: '', fieldsSchema: {} });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1f2937' }}>Templates</h1>
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
            fontWeight: '500'
          }}
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
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: '#1f2937' }}>Add New Template</h2>
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
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
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
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
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
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                Define field types, requirements, and permissions. Leave empty for now.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Add Template
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
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>No templates yet. Create your first template to get started.</p>
      </div>
    </div>
  );
}