'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import { UIcon } from '../../components/UIcon';
import FileUpload from '../../components/FileUpload';
import { AdminButton } from '../../components/AdminButton';
import {
  formatDateToronto,
  fromTorontoDateTimeLocalInput,
  toTorontoDateTimeLocalInput,
} from '@/lib/dates';

/** Stored UTC ISO → datetime-local value in Toronto wall time. */
function eventDateLocalFromStored(iso: string | undefined | null): string {
  if (!iso) return '';
  return toTorontoDateTimeLocalInput(iso);
}

/** datetime-local picker value → UTC ISO for API, or null when empty. */
function eventDateIsoForApi(
  localValue: string,
): { ok: true; iso: string | null } | { ok: false } {
  if (!localValue?.trim()) {
    return { ok: true, iso: null };
  }
  const parsed = fromTorontoDateTimeLocalInput(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false };
  }
  return { ok: true, iso: parsed.toISOString() };
}

interface Event {
  id: string;
  clientId: string;
  eventDate?: string;
  eventType?: string;
  eventLocation?: string;
  eventStartTime?: string;
  eventDuration?: string;
  eventPackage?: string;
  packagePrice?: number;
  notes?: string;
  eventName?: string;
  eventPhone?: string;
  unlimitedPrints?: boolean;
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    agreements: number;
  };
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  emailGreetingName?: string | null;
  email: string;
  phone?: string;
  notes?: string;
  isWhitelabelClient?: boolean;
  createdAt: string;
  updatedAt: string;
  events?: Event[];
  // Deprecated fields for backward compatibility
  eventDate?: string;
  eventType?: string;
  eventLocation?: string;
  eventStartTime?: string;
  eventDuration?: string;
  eventPackage?: string;
  packagePrice?: number;
}

export default function ClientsPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Clients | Admin | Photobooth Guys';
  }, []);

  const ITEMS_PER_PAGE = 25;

  const hasFetchedData = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [addingEventToClient, setAddingEventToClient] = useState<Client | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState<Record<string, boolean>>({});
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    emailGreetingName: '',
    email: '',
    phone: '',
    eventDate: '',
    eventType: '',
    eventLocation: '',
    eventStartTime: '',
    eventDuration: '',
    eventPackage: '',
    packagePrice: '',
    notes: '',
    isWhitelabelClient: false
  });
  const [newEvent, setNewEvent] = useState({
    eventDate: '',
    eventType: '',
    eventLocation: '',
    eventStartTime: '',
    eventDuration: '',
    eventPackage: '',
    packagePrice: '',
    notes: '',
    eventName: '',
    eventPhone: '',
    unlimitedPrints: false
  });
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
    if (hasFetchedData.current) return;
    hasFetchedData.current = true;
    
    fetchClients();
  }, []);

  // Handle "/" key to focus search bar
  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      // Only trigger if "/" is pressed and user is not already typing in an input/textarea
      if (event.key === '/' && searchInputRef.current) {
        const target = event.target as HTMLElement;
        const isInputFocused = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.isContentEditable;
        
        // Don't trigger if user is already typing in an input field
        if (!isInputFocused) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  useEffect(() => {
    if (!showAddForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showAddForm]);

  // Debounce search input by 300ms so filtering only fires after typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever the search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Filter clients — runs only when clients or debounced search term change
  const filteredClients = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return clients;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return clients.filter(client => {
      if (
        client.firstName.toLowerCase().includes(searchLower) ||
        client.lastName.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        (client.phone && client.phone.toLowerCase().includes(searchLower)) ||
        (client.notes && client.notes.toLowerCase().includes(searchLower))
      ) {
        return true;
      }
      if (client.events && client.events.length > 0) {
        return client.events.some(event =>
          (event.eventType && event.eventType.toLowerCase().includes(searchLower)) ||
          (event.eventLocation && event.eventLocation.toLowerCase().includes(searchLower)) ||
          (event.eventPackage && event.eventPackage.toLowerCase().includes(searchLower)) ||
          (event.notes && event.notes.toLowerCase().includes(searchLower))
        );
      }
      return (
        (client.eventType && client.eventType.toLowerCase().includes(searchLower)) ||
        (client.eventLocation && client.eventLocation.toLowerCase().includes(searchLower)) ||
        (client.eventPackage && client.eventPackage.toLowerCase().includes(searchLower))
      );
    });
  }, [clients, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchClients = async () => {
    try {
      const response = await adminFetch('/api/clients');
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

    const eventDateResult = eventDateIsoForApi(newClient.eventDate);
    if (!eventDateResult.ok) {
      showToast('Invalid event date — please re-select a date and time', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newClient,
          eventDate: eventDateResult.iso,
        }),
      });

      if (response.ok) {
        const createdClient = await response.json();
        setClients([createdClient, ...clients]);
        setShowAddForm(false);
        setNewClient({ firstName: '', lastName: '', emailGreetingName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', isWhitelabelClient: false });
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

    const eventDateResult = eventDateIsoForApi(newClient.eventDate);
    if (!eventDateResult.ok) {
      showToast('Invalid event date — please re-select a date and time', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch(`/api/clients/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newClient,
          id: editingClient.id,
          eventDate: eventDateResult.iso,
        }),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c));
        setShowAddForm(false);
        setEditingClient(null);
        setNewClient({ firstName: '', lastName: '', emailGreetingName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', isWhitelabelClient: false });
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
      emailGreetingName: client.emailGreetingName || '',
      email: client.email,
      phone: client.phone || '',
      eventDate: eventDateLocalFromStored(client.eventDate),
      eventType: client.eventType || '',
      eventLocation: client.eventLocation || '',
      eventStartTime: client.eventStartTime || '',
      eventDuration: client.eventDuration || '',
      eventPackage: client.eventPackage || '',
      packagePrice: client.packagePrice ? client.packagePrice.toString() : '',
      notes: client.notes || '',
      isWhitelabelClient: client.isWhitelabelClient || false
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingClient(null);
    setEditingEvent(null);
    setAddingEventToClient(null);
    setNewClient({ firstName: '', lastName: '', emailGreetingName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', isWhitelabelClient: false });
    setNewEvent({ eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', eventName: '', eventPhone: '', unlimitedPrints: false });
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminFetch('/api/clients/delete', {
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

  const handleCreateAgreement = (client: Client, event?: Event) => {
    // Navigate to agreements page with client and event pre-selected
    // We'll use URL parameters to pass the client and event data
    const clientData = encodeURIComponent(JSON.stringify({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email
    }));
    
    let url = `/admin/agreements?create=true&client=${clientData}`;
    
    // If event is provided, include event data in URL
    if (event) {
      const eventData = encodeURIComponent(JSON.stringify({
        id: event.id,
        eventDate: event.eventDate,
        eventType: event.eventType,
        eventLocation: event.eventLocation,
        eventStartTime: event.eventStartTime,
        eventDuration: event.eventDuration,
        eventPackage: event.eventPackage,
        packagePrice: event.packagePrice,
        notes: event.notes
      }));
      url += `&event=${eventData}`;
    }
    
    router.push(url);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setNewEvent({
      eventDate: eventDateLocalFromStored(event.eventDate),
      eventType: event.eventType || '',
      eventLocation: event.eventLocation || '',
      eventStartTime: event.eventStartTime || '',
      eventDuration: event.eventDuration || '',
      eventPackage: event.eventPackage || '',
      packagePrice: event.packagePrice ? event.packagePrice.toString() : '',
      notes: event.notes || '',
      eventName: event.eventName || '',
      eventPhone: event.eventPhone || '',
      unlimitedPrints: event.unlimitedPrints || false
    });
    setShowAddForm(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    const eventDateResult = eventDateIsoForApi(newEvent.eventDate);
    if (!eventDateResult.ok) {
      showToast('Invalid event date — please re-select a date and time', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch('/api/events/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEvent,
          id: editingEvent.id,
          eventDate: eventDateResult.iso,
        }),
      });

      if (response.ok) {
        const updatedEvent = await response.json();
        showToast('Event updated successfully!');
        setShowAddForm(false);
        setEditingEvent(null);
setNewEvent({ eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', eventName: '', eventPhone: '', unlimitedPrints: false });
    fetchClients(); // Refresh the list
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to update event (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showToast('Failed to update event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewEvent = (client: Client) => {
    setAddingEventToClient(client);
    setEditingEvent(null);
    setNewEvent({ eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', eventName: '', eventPhone: '', unlimitedPrints: false });
    setShowAddForm(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingEventToClient) return;

    const eventDateResult = eventDateIsoForApi(newEvent.eventDate);
    if (!eventDateResult.ok) {
      showToast('Invalid event date — please re-select a date and time', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await adminFetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEvent,
          clientId: addingEventToClient.id,
          eventDate: eventDateResult.iso,
        }),
      });

      if (response.ok) {
        const createdEvent = await response.json();
        showToast('Event added successfully!');
        setShowAddForm(false);
        setAddingEventToClient(null);
        setNewEvent({ eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', eventName: '', eventPhone: '', unlimitedPrints: false });
        fetchClients(); // Refresh the list
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to add event (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error adding event:', error);
      showToast('Failed to add event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditEvent = () => {
    setShowAddForm(false);
    setEditingEvent(null);
    setAddingEventToClient(null);
    setNewEvent({ eventDate: '', eventType: '', eventLocation: '', eventStartTime: '', eventDuration: '', eventPackage: '', packagePrice: '', notes: '', eventName: '', eventPhone: '', unlimitedPrints: false });
  };

  const handleArchiveEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to archive this event? It will be hidden from the client page but can be unarchived later.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminFetch('/api/events/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        showToast('Event archived successfully', 'success');
        fetchClients(); // Refresh the list
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to archive event', 'error');
      }
    } catch (error) {
      console.error('Error archiving event:', error);
      showToast('Error archiving event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mainBg = 'var(--admin-bg)';
  const cardBg = 'var(--admin-surface)';
  const textColor = 'var(--admin-text)';
  const mutedText = 'var(--admin-muted)';
  const borderColor = 'var(--admin-hairline)';

  // Helper function to check if an event has no agreements
  const hasNoAgreements = (event: Event): boolean => {
    return (event._count?.agreements ?? 0) === 0;
  };

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
            <h1 className="admin-page-title" style={{ 
              margin: '0', 
              fontSize: isMobile ? '24px' : '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Clients
            </h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p style={{ 
              margin: '8px 0 0 0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage your client database
            </p>
          </div>
          <AdminButton
            variant="primary"
            fullWidth={isMobile}
            onClick={() => setShowAddForm(true)}
            title="Add a new client"
          >
            + New Client
          </AdminButton>
        </div>

        {/* Search Bar */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '2px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flex: 1,
              width: isMobile ? '100%' : 'auto'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                style={{ color: mutedText }}
              >
                <path 
                  d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16ZM19 19l-4.35-4.35" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search clients by name, email, phone, event details, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '2px',
                  backgroundColor: cardBg,
                  color: textColor,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: mutedText,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {debouncedSearchTerm && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '14px', 
              color: mutedText 
            }}>
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

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
            onClick={() =>
              editingEvent || addingEventToClient ? handleCancelEditEvent() : handleCancelEdit()
            }
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '2px',
                padding: '24px',
                width: '100%',
                maxWidth: '800px',
                maxHeight: 'min(90vh, 100%)',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
              {editingEvent ? 'Edit Event' : addingEventToClient ? 'Add New Event' : editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            <form onSubmit={editingEvent ? handleUpdateEvent : addingEventToClient ? handleAddEvent : editingClient ? handleUpdateClient : handleAddClient}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: '16px',
                marginBottom: '16px'
              }}>
                {(editingEvent || addingEventToClient) ? (
                  // Event editing/adding fields
                  <>
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
                        value={newEvent.eventDate}
                        onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                      />
                    </div>
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
                        value={newEvent.eventType}
                        onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., Wedding, Corporate Event"
                      />
                    </div>
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
                        value={newEvent.eventLocation}
                        onChange={(e) => setNewEvent({ ...newEvent, eventLocation: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., Grand Ballroom, Downtown Hotel"
                      />
                    </div>
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
                        value={newEvent.eventStartTime}
                        onChange={(e) => setNewEvent({ ...newEvent, eventStartTime: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 2:00 PM, 14:00"
                      />
                    </div>
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
                        value={newEvent.eventDuration}
                        onChange={(e) => setNewEvent({ ...newEvent, eventDuration: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 4 hours, 8 hours"
                      />
                    </div>
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
                        value={newEvent.eventPackage}
                        onChange={(e) => setNewEvent({ ...newEvent, eventPackage: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
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
                        Package Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newEvent.packagePrice}
                        onChange={(e) => setNewEvent({ ...newEvent, packagePrice: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 1500.00"
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: textColor,
                        padding: '10px 12px',
                        borderRadius: '2px',
                        border: `1px solid ${newEvent.unlimitedPrints ? 'var(--accent)' : borderColor}`,
                        backgroundColor: newEvent.unlimitedPrints ? ('rgba(var(--accent-rgb),0.12)') : cardBg,
                        transition: 'all 0.2s',
                      }}>
                        <input
                          type="checkbox"
                          checked={newEvent.unlimitedPrints}
                          onChange={(e) => setNewEvent({ ...newEvent, unlimitedPrints: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span>Unlimited Prints</span>
                        {newEvent.unlimitedPrints && (
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>
                            ∞ Enabled
                          </span>
                        )}
                      </label>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontWeight: '500', 
                        color: textColor 
                      }}>
                        Event Name (for whitelabel clients)
                      </label>
                      <input
                        type="text"
                        value={newEvent.eventName}
                        onChange={(e) => setNewEvent({ ...newEvent, eventName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., Jenny & Billy's Wedding"
                      />
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '12px', 
                        color: mutedText 
                      }}>
                        Event-specific contact name (shown to attendants instead of company name)
                      </p>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontWeight: '500', 
                        color: textColor 
                      }}>
                        Event Contact Phone (for whitelabel clients)
                      </label>
                      <input
                        type="tel"
                        value={newEvent.eventPhone}
                        onChange={(e) => setNewEvent({ ...newEvent, eventPhone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., (555) 123-4567"
                      />
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '12px', 
                        color: mutedText 
                      }}>
                        Event-specific contact phone (shown to attendants instead of company phone)
                      </p>
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
                        value={newEvent.notes}
                        onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                        placeholder="Enter any additional notes"
                      />
                    </div>
                  </>
                ) : (
                  // Client editing/adding fields
                  <>
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
                        required={!editingClient}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
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
                        required={!editingClient}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
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
                        Email greeting name
                      </label>
                      <input
                        type="text"
                        value={newClient.emailGreetingName}
                        onChange={(e) => setNewClient({ ...newClient, emailGreetingName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="Optional greeting name for emails"
                      />
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: mutedText, lineHeight: 1.4 }}>
                        Optional. Used only in automated email greetings. Leave blank to use the first name.
                      </p>
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
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        spellCheck={false}
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        required={!editingClient}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
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
                          borderRadius: '2px',
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                      />
                    </div>
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., Wedding, Corporate Event"
                      />
                    </div>
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., Grand Ballroom, Downtown Hotel"
                      />
                    </div>
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 2:00 PM, 14:00"
                      />
                    </div>
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 4 hours, 8 hours"
                      />
                    </div>
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
                          borderRadius: '2px',
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
                        Package Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newClient.packagePrice}
                        onChange={(e) => setNewClient({ ...newClient, packagePrice: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${borderColor}`,
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px'
                        }}
                        placeholder="e.g., 1500.00"
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
                          borderRadius: '2px',
                          backgroundColor: cardBg,
                          color: textColor,
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                        placeholder="Enter any additional notes"
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '500', 
                        color: textColor 
                      }}>
                        <input
                          type="checkbox"
                          checked={newClient.isWhitelabelClient}
                          onChange={(e) => setNewClient({ ...newClient, isWhitelabelClient: e.target.checked })}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <span>Whitelabel Client (Company with multiple events)</span>
                      </label>
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '12px', 
                        color: mutedText 
                      }}>
                        Enable this for companies that provide multiple events (e.g., DJ companies providing photo booths)
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <AdminButton
                  variant="ghost"
                  onClick={editingEvent || addingEventToClient ? handleCancelEditEvent : handleCancelEdit}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading 
                    ? (editingEvent ? 'Updating Event...' : addingEventToClient ? 'Adding Event...' : editingClient ? 'Updating...' : 'Adding...') 
                    : (editingEvent ? 'Update Event' : addingEventToClient ? 'Add Event' : editingClient ? 'Update Client' : 'Add Client')}
                </AdminButton>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '2px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              {debouncedSearchTerm ? 'No clients found matching your search.' : 'No clients found. Add your first client to get started.'}
            </p>
          </div>
        ) : (
          <>
          <div style={{ display: 'grid', gap: '16px' }}>
            {paginatedClients.map(client => (
              <div key={client.id} style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '2px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: '0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                        {client.firstName} {client.lastName}
                      </h3>
                      {client.isWhitelabelClient && (
                        <span style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-on)',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Whitelabel
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {client.email}
                    </p>
                    {client.phone && (
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        {client.phone}
                      </p>
                    )}
                      {client.notes && (
                      <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                        {client.notes}
                      </p>
                    )}
                    {/* Display all non-archived events */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: '0', fontSize: '14px', color: textColor, fontWeight: '600' }}>
                          Events ({client.events ? client.events.length : 0}):
                        </h4>
                        <AdminButton
                          variant="primary"
                          size="compact"
                          onClick={() => handleAddNewEvent(client)}
                          title="Add a new event to this client"
                        >
                          + Add Event
                        </AdminButton>
                      </div>
                      {client.events && client.events.length > 0 && (
                        <>
                          {client.events.map((event) => {
                            const noAgreements = hasNoAgreements(event);
                            return (
                          <div key={event.id} style={{
                            marginBottom: '12px',
                            padding: '12px',
                            backgroundColor: 'var(--admin-surface)',
                            border: noAgreements ? '2px solid var(--warn)' : `1px solid ${borderColor}`,
                            borderRadius: '2px',
                            boxShadow: noAgreements ? '0 0 8px rgba(247, 127, 0, 0.5), 0 0 16px rgba(247, 127, 0, 0.3)' : 'none'
                          }}>
                            {event.eventName && (
                              <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '15px', fontWeight: '600' }}>
                                {event.eventName}
                              </p>
                            )}
                            {event.eventDate && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px', fontWeight: '500' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <UIcon name="calendar" style={{ fontSize: '14px' }} />
                                  {formatDateToronto(event.eventDate)}
                                </span>
                              </p>
                            )}
                            {event.eventType && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Type: {event.eventType}
                              </p>
                            )}
                            {event.eventPhone && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Event Phone: {event.eventPhone}
                              </p>
                            )}
                            {event.eventLocation && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Location: {event.eventLocation}
                              </p>
                            )}
                            {event.eventStartTime && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Time: {event.eventStartTime}
                              </p>
                            )}
                            {event.eventDuration && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Duration: {event.eventDuration}
                              </p>
                            )}
                            {event.eventPackage && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Package: {event.eventPackage}
                              </p>
                            )}
                            {event.packagePrice && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Price: ${parseFloat(event.packagePrice.toString()).toFixed(2)}
                              </p>
                            )}
                            {event.unlimitedPrints && (
                              <p style={{ margin: '0 0 4px 0', color: 'var(--accent)', fontSize: '14px', fontWeight: '600' }}>
                                ∞ Unlimited Prints
                              </p>
                            )}
                            {event.notes && (
                              <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                                Notes: {event.notes}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <AdminButton
                                variant="primary"
                                size="compact"
                                onClick={() => handleCreateAgreement(client, event)}
                                title="Create agreement for this event"
                              >
                                Create Agreement
                              </AdminButton>
                              <AdminButton
                                variant="ghost"
                                size="compact"
                                onClick={() => handleEditEvent(event)}
                                title="Edit event details"
                              >
                                Edit Event
                              </AdminButton>
                              <AdminButton
                                variant="danger"
                                size="compact"
                                onClick={() => handleArchiveEvent(event.id)}
                                title="Archive this event"
                              >
                                Archive Event
                              </AdminButton>
                            </div>
                          </div>
                          );
                          })}
                        </>
                      )}
                    </div>
                    {/* Fallback: show deprecated client event fields if no events exist */}
                    {(!client.events || client.events.length === 0) && client.eventDate && (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--admin-surface)', border: `1px solid ${borderColor}`, borderRadius: '2px' }}>
                        <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '12px', fontStyle: 'italic' }}>
                          (Legacy event data - will be migrated)
                        </p>
                        {client.eventDate && (
                          <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                            Event: {formatDateToronto(client.eventDate)}
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
                      </div>
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
                      backgroundColor: 'var(--admin-surface-raised)',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      alignSelf: isMobile ? 'flex-start' : 'auto'
                    }}>
                      Added {formatDateToronto(client.createdAt)}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <AdminButton
                    variant="ghost"
                    onClick={() => handleEditClient(client)}
                    title="Edit client details"
                  >
                    Edit
                  </AdminButton>
                  {/* Create Agreement button moved to individual events - only show if client has no events */}
                  {(!client.events || client.events.length === 0) && (
                    <AdminButton
                      variant="primary"
                      onClick={() => handleCreateAgreement(client)}
                      title="Create new agreement for this client"
                    >
                      Create Agreement
                    </AdminButton>
                  )}
                  <AdminButton
                    variant="danger"
                    onClick={() => handleDeleteClient(client.id)}
                    disabled={loading}
                    title="Delete client permanently"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    onClick={() => setShowFileUpload(prev => ({ ...prev, [client.id]: !prev[client.id] }))}
                    title="Upload files to Google Drive"
                  >
                    {showFileUpload[client.id] ? 'Hide Upload' : 'Upload Files'}
                  </AdminButton>
                </div>
                {/* File Upload Section */}
                {showFileUpload[client.id] && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: 'var(--admin-surface)',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '2px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: textColor }}>
                      Upload Files to Google Drive
                    </h4>
                    <FileUpload
                      clientId={client.id}
                      eventId={null}
                      onUploadSuccess={() => {
                        showToast('File uploaded successfully!');
                      }}
                      onUploadError={(error) => {
                        showToast(error, 'error');
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '24px',
              padding: '16px',
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '2px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <span style={{ fontSize: '14px', color: mutedText }}>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)} of {filteredClients.length} clients
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AdminButton
                  variant={currentPage === 1 ? 'ghost' : 'primary'}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Prev
                </AdminButton>
                <span style={{ fontSize: '14px', color: textColor, minWidth: '80px', textAlign: 'center' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <AdminButton
                  variant={currentPage === totalPages ? 'ghost' : 'primary'}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </AdminButton>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

