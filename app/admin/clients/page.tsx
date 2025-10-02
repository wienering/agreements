'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  eventDate: string | null;
  notes: string | null;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    eventDate: '',
    notes: ''
  });
  const { isDark } = useDarkMode();

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
        setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', notes: '' });
        alert('Client added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client');
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
      eventDate: client.eventDate ? new Date(client.eventDate).toISOString().split('T')[0] : '',
      notes: client.notes || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c));
        setShowAddForm(false);
        setEditingClient(null);
        setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', notes: '' });
        alert('Client updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingClient(null);
    setNewClient({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', notes: '' });
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
            Photobooth Guys - Clients
          </h1>
          <p style={{ margin: 0, color: mutedText, fontSize: '16px' }}>
            Manage your client information
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
          title="Add a new client to the system"
        >
          + Add Client
        </button>
      </div>

      {showAddForm && (
        <div style={{
          backgroundColor: cardBg,
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`,
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </h2>
          <form onSubmit={editingClient ? handleUpdateClient : handleAddClient}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={newClient.firstName}
                  onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                  required
                  title="Client's first name"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newClient.lastName}
                  onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                  required
                  title="Client's last name"
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
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  required
                  title="Client's email address for communication"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  title="Client's phone number"
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                  Event Date
                </label>
                <input
                  type="date"
                  value={newClient.eventDate}
                  onChange={(e) => setNewClient({ ...newClient, eventDate: e.target.value })}
                  title="Date of the client's event"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: inputBg,
                    color: textColor,
                    colorScheme: isDark ? 'dark' : 'light'
                  }}
                />
              </div>
              <div>
                {/* Empty div for spacing */}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: textColor }}>
                Notes
              </label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  rows={3}
                  title="Additional notes about the client"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    resize: 'vertical',
                    backgroundColor: inputBg,
                    color: textColor
                  }}
                />
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
                title={editingClient ? 'Save client changes' : 'Save the new client'}
              >
                {loading ? (editingClient ? 'Updating...' : 'Adding...') : (editingClient ? 'Update Client' : 'Add Client')}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
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
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients List */}
      <div style={{ 
        backgroundColor: cardBg, 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`,
        padding: '24px'
      }}>
        {clients.length === 0 ? (
          <p style={{ color: mutedText, fontSize: '16px', textAlign: 'center' }}>No clients yet. Add your first client to get started.</p>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: textColor, fontWeight: 'bold' }}>
              Clients ({clients.length})
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {clients.map((client) => (
                <div key={client.id} style={{
                  padding: '16px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                        {client.firstName} {client.lastName}
                      </h3>
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>{client.email}</p>
                      {client.phone && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>{client.phone}</p>
                      )}
                      {client.eventDate && (
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                          Event: {new Date(client.eventDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: mutedText,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      Added {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditClient(client)}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                      title="Edit client details"
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