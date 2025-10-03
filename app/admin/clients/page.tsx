'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  eventDate?: string;
  notes?: string;
  eventType?: string;
  eventLocation?: string;
  eventStartTime?: string;
  eventDuration?: string;
  eventPackage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    eventDate: '',
    eventType: '',
    eventLocation: '',
    eventStartTime: '',
    eventDuration: '',
    eventPackage: '',
    notes: ''
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

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
      });

      if (response.ok) {
        const createdClient = await response.json();
        setClients([createdClient, ...clients]);
        setShowAddForm(false);
        setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', notes: '' });
        showToast('Client added successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to create client (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating client:', error);
      showToast('Failed to create client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/clients/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newClient, id: editingClient.id }),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c));
        setShowAddForm(false);
        setEditingClient(null);
        setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', notes: '' });
        showToast('Client updated successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to update client (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Failed to update client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone || '',
      eventDate: client.eventDate ? new Date(client.eventDate).toISOString().slice(0, 16) : '',
      eventType: client.eventType || '',
      eventLocation: client.eventLocation || '',
      eventStartTime: client.eventStartTime || '',
      eventDuration: client.eventDuration || '',
      eventPackage: client.eventPackage || '',
      notes: client.notes || ''
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingClient(null);
    setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', notes: '' });
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/clients/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: clientId }),
      });

      if (response.ok) {
        showToast('Client deleted successfully', 'success');
        fetchClients(); // Refresh the list
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete client', 'error');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Error deleting client', 'error');
    } finally {
      setLoading(false);
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
              Clients
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage your client database
            </p>
          </div>
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
            title="Add a new client"
          >
            + New Client
          </button>
        </div>

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
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            <form onSubmit={editingClient ? handleUpdateClient : handleAddClient}>
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
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
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
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
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
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
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
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Event Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newClient.eventDate}
                    onChange={(e) => setNewClient({ ...newClient, eventDate: e.target.value })}
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

                {/* Event Type */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={newClient.eventType}
                    onChange={(e) => setNewClient({ ...newClient, eventType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Wedding, Corporate Event"
                  />
                </div>

                {/* Event Location */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Event Location
                  </label>
                  <input
                    type="text"
                    value={newClient.eventLocation}
                    onChange={(e) => setNewClient({ ...newClient, eventLocation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Grand Ballroom, Downtown Hotel"
                  />
                </div>

                {/* Event Start Time */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Event Start Time
                  </label>
                  <input
                    type="text"
                    value={newClient.eventStartTime}
                    onChange={(e) => setNewClient({ ...newClient, eventStartTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., 2:00 PM, 14:00"
                  />
                </div>

                {/* Event Duration */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Event Duration
                  </label>
                  <input
                    type="text"
                    value={newClient.eventDuration}
                    onChange={(e) => setNewClient({ ...newClient, eventDuration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., 4 hours, 8 hours"
                  />
                </div>

                {/* Event Package */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Package
                  </label>
                  <input
                    type="text"
                    value={newClient.eventPackage}
                    onChange={(e) => setNewClient({ ...newClient, eventPackage: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Premium Package, Basic Package"
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="Enter any additional notes"
                  />
                </div>
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
                  {loading ? (editingClient ? 'Updating...' : 'Adding...') : (editingClient ? 'Update Client' : 'Add Client')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Clients List */}
        {clients.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              No clients found. Add your first client to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {clients.map(client => (
              <div key={client.id} style={{
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
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                      {client.firstName} {client.lastName}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {client.email}
                    </p>
                    {client.phone && (
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        {client.phone}
                      </p>
                    )}
                      {client.eventDate && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Event: {new Date(client.eventDate).toLocaleDateString()}
                        </p>
                      )}
                      {client.eventType && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Type: {client.eventType}
                        </p>
                      )}
                      {client.eventLocation && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Location: {client.eventLocation}
                        </p>
                      )}
                      {client.eventStartTime && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Time: {client.eventStartTime}
                        </p>
                      )}
                      {client.eventDuration && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Duration: {client.eventDuration}
                        </p>
                      )}
                      {client.eventPackage && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Package: {client.eventPackage}
                        </p>
                      )}
                      {client.notes && (
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        {client.notes}
                      </p>
                    )}
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
                      Added {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleEditClient(client)}
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
                    title="Edit client details"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    disabled={loading}
                    style={{
                      backgroundColor: loading ? '#9ca3af' : '#dc2626',
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
                        e.currentTarget.style.backgroundColor = '#b91c1c';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }
                    }}
                    title="Delete client permanently"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
