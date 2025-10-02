'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useSearchParams } from 'next/navigation';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Template {
  id: string;
  title: string;
  htmlContent: string;
  version: number;
}

interface Agreement {
  id: string;
  client: Client;
  template: Template;
  status: string;
  uniqueToken: string;
  expiresAt: string | null;
  createdAt: string;
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [showAgreementEditor, setShowAgreementEditor] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    clientId: '',
    templateId: '',
    expiresAt: ''
  });
  const { isDark } = useDarkMode();
  const searchParams = useSearchParams();

  // Fetch data on component mount
  useEffect(() => {
    fetchAgreements();
    fetchClients();
    fetchTemplates();
  }, []);

  // Handle template pre-selection from URL
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (templateId) {
      setNewAgreement(prev => ({ ...prev, templateId }));
      setShowCreateForm(true);
    }
  }, [searchParams]);

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/api/agreements');
      if (response.ok) {
        const data = await response.json();
        setAgreements(data);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

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

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgreement),
      });

      if (response.ok) {
        const createdAgreement = await response.json();
        setAgreements([createdAgreement, ...agreements]);
        setShowCreateForm(false);
        setNewAgreement({ clientId: '', templateId: '', expiresAt: '' });
        alert('Agreement created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating agreement:', error);
      alert('Failed to create agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAgreement = async (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setEditingContent(agreement.template.htmlContent);
    setShowAgreementEditor(true);
  };

  const handleSaveAgreement = async () => {
    if (!selectedAgreement) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/agreements/${selectedAgreement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: editingContent
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        setAgreements(agreements.map(a => 
          a.id === selectedAgreement.id ? { ...a, template: { ...a.template, htmlContent: editingContent } } : a
        ));
        setSelectedAgreement({ ...selectedAgreement, template: { ...selectedAgreement.template, htmlContent: editingContent } });
        alert('Agreement saved successfully!');
      } else {
        alert('Failed to save agreement');
      }
    } catch (error) {
      console.error('Error saving agreement:', error);
      alert('Failed to save agreement');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async (agreement: Agreement) => {
    try {
      const response = await fetch(`/api/agreements/${agreement.id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update the agreement status
        setAgreements(agreements.map(a => 
          a.id === agreement.id ? { ...a, status: 'SENT' } : a
        ));
        alert('Agreement sent to client successfully!');
      } else {
        alert('Failed to send agreement to client');
      }
    } catch (error) {
      console.error('Error sending agreement:', error);
      alert('Failed to send agreement to client');
    }
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#ffffff';

  return (
    <div style={{ padding: '24px', backgroundColor: mainBg, minHeight: '100vh', color: textColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: textColor, fontWeight: 'bold' }}>
            Photobooth Guys - Agreements
          </h1>
          <p style={{ margin: 0, color: mutedText, fontSize: '16px' }}>
            Create and manage client agreements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowSmartFields(!showSmartFields)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            title="View all available smart fields for templates"
          >
            <span>🔧</span>
            {showSmartFields ? 'Hide' : 'Show'} Smart Fields
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
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
            title="Create a new agreement for a client"
          >
            + Create Agreement
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
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

      {showCreateForm && (
        <div style={{
          backgroundColor: cardBg,
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`,
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>Create New Agreement</h2>
          <form onSubmit={handleCreateAgreement}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Select Client *
                </label>
                <select
                  value={newAgreement.clientId}
                  onChange={(e) => setNewAgreement({ ...newAgreement, clientId: e.target.value })}
                  required
                  title="Choose which client this agreement is for"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Select Template *
                </label>
                <select
                  value={newAgreement.templateId}
                  onChange={(e) => setNewAgreement({ ...newAgreement, templateId: e.target.value })}
                  required
                  title="Choose which template to use for this agreement"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title} (v{template.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                Expiration Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={newAgreement.expiresAt}
                onChange={(e) => setNewAgreement({ ...newAgreement, expiresAt: e.target.value })}
                title="Set when this agreement expires (optional)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: inputBg,
                  color: textColor
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: mutedText, fontSize: '14px' }}>
                Leave empty for no expiration
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
                title="Create the agreement and generate client link"
              >
                {loading ? 'Creating...' : 'Create Agreement'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
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
                title="Cancel creating agreement"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agreements List */}
      <div style={{ 
        backgroundColor: cardBg, 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`,
        padding: '24px'
      }}>
        {agreements.length === 0 ? (
          <p style={{ color: mutedText, fontSize: '16px', textAlign: 'center' }}>No agreements yet. Create your first agreement to get started.</p>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>
              Agreements ({agreements.length})
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {agreements.map((agreement) => (
                <div key={agreement.id} style={{
                  padding: '16px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                        {agreement.client.firstName} {agreement.client.lastName}
                      </h3>
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        Template: {agreement.template.title} (v{agreement.template.version})
                      </p>
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        Status: <span style={{ 
                          color: agreement.status === 'SIGNED' ? '#059669' : 
                                agreement.status === 'SENT' ? '#3b82f6' : '#6b7280',
                          fontWeight: '500'
                        }}>
                          {agreement.status}
                        </span>
                      </p>
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: mutedText,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      Created {new Date(agreement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleViewAgreement(agreement)}
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
                      title="View and edit agreement before sending"
                    >
                      View/Edit
                    </button>
                    <button
                      onClick={() => {
                        const clientLink = `${window.location.origin}/agreement/${agreement.uniqueToken}`;
                        navigator.clipboard.writeText(clientLink).then(() => {
                          alert('Client link copied to clipboard!');
                        }).catch(() => {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = clientLink;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          alert('Client link copied to clipboard!');
                        });
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
                      title="Copy client link to clipboard"
                    >
                      Copy Link
                    </button>
                    {agreement.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendToClient(agreement)}
                        style={{
                          backgroundColor: '#dc2626',
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
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                        title="Send agreement to client"
                      >
                        Send to Client
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Agreement Editor Modal */}
      {showAgreementEditor && selectedAgreement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '1000px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: `1px solid ${borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: textColor, fontWeight: 'bold' }}>
                  Agreement Editor
                </h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
                  {selectedAgreement.client.firstName} {selectedAgreement.client.lastName} - {selectedAgreement.template.title}
                </p>
              </div>
              <button
                onClick={() => setShowAgreementEditor(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: textColor,
                  padding: '8px'
                }}
                title="Close editor"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              padding: '24px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Editor */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Agreement Content (HTML)
                </label>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '400px',
                    padding: '16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: textColor,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter HTML content for the agreement..."
                />
              </div>

              {/* Preview */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Preview
                </label>
                <div style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  padding: '24px',
                  backgroundColor: isDark ? '#0f172a' : '#fafafa',
                  fontFamily: 'Georgia, serif',
                  lineHeight: '1.6',
                  fontSize: '16px',
                  color: textColor,
                  minHeight: '200px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: editingContent || '<p>Enter content above to see preview...</p>'
                  }} />
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'center',
                paddingTop: '16px',
                borderTop: `1px solid ${borderColor}`
              }}>
                <button
                  onClick={handleSaveAgreement}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                  title="Save changes to this agreement"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    const clientLink = `${window.location.origin}/agreement/${selectedAgreement.uniqueToken}`;
                    window.open(clientLink, '_blank');
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                  title="Open client view in new tab"
                >
                  Preview Client View
                </button>
                <button
                  onClick={() => handleSendToClient(selectedAgreement)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                  title="Send this agreement to the client"
                >
                  Send to Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}