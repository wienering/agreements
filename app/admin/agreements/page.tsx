'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import RichTextEditor, { RichTextPreview } from '../../components/RichTextEditor';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    id: string;
    title: string;
    htmlContent: string;
  };
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    clientId: '',
    templateId: '',
    expiresAt: ''
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

  // Fetch data on component mount
  useEffect(() => {
    fetchAgreements();
    fetchClients();
    fetchTemplates();
  }, []);

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
        showToast('Agreement created successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to create agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating agreement:', error);
      showToast('Failed to create agreement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgreement = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setEditingContent(agreement.template.htmlContent);
  };

  const handleSaveAgreement = async () => {
    if (!selectedAgreement) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/agreements/update-agreement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedAgreement.id,
          htmlContent: editingContent
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        setAgreements(agreements.map(a => 
          a.id === selectedAgreement.id ? updatedAgreement : a
        ));
        setSelectedAgreement(updatedAgreement);
        showToast('Agreement saved successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to save agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving agreement:', error);
      showToast('Failed to save agreement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async (agreement: Agreement) => {
    // Send functionality temporarily disabled
    showToast('Send functionality is not yet implemented. Please use the "Copy Link" button to share the agreement with the client.', 'info');
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to delete this agreement? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/agreements/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: agreementId }),
      });

      if (response.ok) {
        setAgreements(agreements.filter(a => a.id !== agreementId));
        showToast('Agreement deleted successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to delete agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
      showToast('Failed to delete agreement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (uniqueToken: string) => {
    try {
      const clientLink = `${window.location.origin}/agreement/${uniqueToken}`;
      await navigator.clipboard.writeText(clientLink);
      showToast('Copied!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showToast('Failed to copy link', 'error');
    }
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
              Agreements
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage client agreements and contracts
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
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
            title="Create a new agreement"
          >
            + New Agreement
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
              Create New Agreement
            </h2>
            <form onSubmit={handleCreateAgreement}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Client
                  </label>
                  <select
                    value={newAgreement.clientId}
                    onChange={(e) => setNewAgreement({ ...newAgreement, clientId: e.target.value })}
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
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} ({client.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Template
                  </label>
                  <select
                    value={newAgreement.templateId}
                    onChange={(e) => setNewAgreement({ ...newAgreement, templateId: e.target.value })}
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
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={newAgreement.expiresAt}
                    onChange={(e) => setNewAgreement({ ...newAgreement, expiresAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
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
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Agreement'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agreements List */}
        {agreements.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              No agreements found. Create your first agreement to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {agreements.map(agreement => (
              <div key={agreement.id} style={{
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
                  gap: isMobile ? '12px' : '0'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor }}>
                      {agreement.client.firstName} {agreement.client.lastName}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.template.title}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.client.email}
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: mutedText,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      alignSelf: isMobile ? 'flex-start' : 'auto'
                    }}>
                      {agreement.status}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: mutedText,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      alignSelf: isMobile ? 'flex-start' : 'auto'
                    }}>
                      Created {new Date(agreement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleEditAgreement(agreement)}
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
                    title="Edit agreement content"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCopyLink(agreement.uniqueToken)}
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
                  <button
                    onClick={() => handleDeleteAgreement(agreement.id)}
                    disabled={loading}
                    style={{
                      backgroundColor: loading ? '#9ca3af' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#4b5563';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#6b7280';
                      }
                    }}
                    title="Delete this agreement permanently"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {selectedAgreement && (
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
              padding: '24px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: '0', fontSize: '20px', color: textColor }}>
                  Edit Agreement
                </h2>
                <button
                  onClick={() => setSelectedAgreement(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: mutedText
                  }}
                >
                  Ãƒâ€”
                </button>
              </div>

              {/* Content Editor */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Agreement Content
                </label>
                <RichTextEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  placeholder="Enter agreement content here..."
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    color: textColor,
                    borderColor: borderColor
                  }}
                />
              </div>


              {/* Smart Field Quick Add Buttons */}

              <div style={{ marginBottom: '16px' }}>

                <label style={{ 

                  display: 'block', 

                  marginBottom: '8px', 

                  fontWeight: '500', 

                  color: '$' + '{textColor}',

                  fontSize: '14px'

                }}>

                  Quick Add Smart Fields

                </label>

                <div style={{ 

                  display: 'flex', 

                  flexWrap: 'wrap', 

                  gap: '8px'

                }}>

                  {[

                    { field: '{{client.firstName}}', label: 'First Name' },

                    { field: '{{client.lastName}}', label: 'Last Name' },

                    { field: '{{client.email}}', label: 'Email' },

                    { field: '{{client.phone}}', label: 'Phone' },

                    { field: '{{client.eventDate}}', label: 'Event Date' },

                    { field: '{{client.notes}}', label: 'Notes' },

                    { field: '{{agreement.date}}', label: 'Agreement Date' },

                    { field: '{{agreement.id}}', label: 'Agreement ID' }

                  ].map((sf) => (

                    <button

                      key={sf.field}

                      type="button"

                      onClick={() => setEditingContent(prev => prev + ' ' + sf.field)}

                      style={{

                        padding: '6px 12px',

                        fontSize: '12px',

                        borderRadius: '4px',

                        border: '1px solid ' + borderColor,

                        backgroundColor: isDark ? '#1e293b' : '#ffffff',

                        color: textColor,

                        cursor: 'pointer',

                        transition: 'all 0.2s'

                      }}

                      onMouseEnter={(e) => {

                        e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';

                      }}

                      onMouseLeave={(e) => {

                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';

                      }}

                      title={'Insert ' + sf.label}

                    >

                      {sf.label}

                    </button>

                  ))}

                </div>

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
                <RichTextPreview 
                  html={editingContent || '<p>Enter content above to see preview...</p>'}
                  clientData={selectedAgreement?.client}
                  agreementId={selectedAgreement?.id}
                  isDark={isDark}
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#fafafa',
                    borderColor: borderColor
                  }}
                />
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
        )}
      </div>
    </div>
  );
}
