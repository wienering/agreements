'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../../contexts/DarkModeContext';
import { AdminButton } from '../../../components/AdminButton';
import { useRouter } from 'next/navigation';
import { useToast } from '../../../components/Toast';
import { UIcon } from '../../../components/UIcon';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'LIVE' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  archivedAt: string;
  signedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
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

export default function ArchivedAgreementsPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Archived Agreements | Admin | Photobooth Guys';
  }, []);

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deletingAgreement, setDeletingAgreement] = useState<Record<string, boolean>>({});
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

  // Fetch archived agreements
  useEffect(() => {
    fetchArchivedAgreements();
  }, []);

  const fetchArchivedAgreements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agreements/archived');
      if (response.ok) {
        const data = await response.json();
        setAgreements(data);
      } else {
        showToast('Failed to fetch archived agreements', 'error');
      }
    } catch (error) {
      console.error('Error fetching archived agreements:', error);
      showToast('Error fetching archived agreements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to unarchive this agreement? It will appear back in the main agreements list.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/agreements/archive', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId }),
      });

      if (response.ok) {
        showToast('Agreement unarchived successfully', 'success');
        fetchArchivedAgreements(); // Refresh the list
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to unarchive agreement', 'error');
      }
    } catch (error) {
      console.error('Error unarchiving agreement:', error);
      showToast('Error unarchiving agreement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to permanently delete this archived agreement? This action cannot be undone.')) {
      return;
    }

    setDeletingAgreement(prev => ({ ...prev, [agreementId]: true }));
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
        showToast('Archived agreement deleted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to delete agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
      showToast('Failed to delete agreement', 'error');
    } finally {
      setDeletingAgreement(prev => ({ ...prev, [agreementId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-red-100 text-red-800';
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'SIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'LIVE':
        return 'Live';
      case 'SIGNED':
        return 'Signed';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
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
              Archived Agreements
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              View completed and cancelled agreements
            </p>
          </div>
          <AdminButton
            variant="ghost"
            fullWidth={isMobile}
            onClick={() => router.push('/admin/agreements')}
            title="Back to main agreements"
          >
            ← Back to Agreements
          </AdminButton>
        </div>

        {/* Archived Agreements List */}
        {loading ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <UIcon name="spinner" className="animate-spin" style={{ fontSize: '24px', color: textColor }} />
            </div>
            <p style={{ margin: '0', color: textColor }}>Loading archived agreements...</p>
          </div>
        ) : agreements.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              No archived agreements found.
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
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                      {agreement.template.title}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.client.firstName} {agreement.client.lastName} ({agreement.client.email})
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      Archived: {new Date(agreement.archivedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
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
                      backgroundColor: isDark ? '#1a1d1a' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      alignSelf: isMobile ? 'flex-start' : 'auto'
                    }}>
                      {getStatusDisplay(agreement.status)}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => window.open(`/agreement/${agreement.uniqueToken}`, '_blank')}
                    style={{
                      backgroundColor: 'var(--accent)',
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
                      e.currentTarget.style.backgroundColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent)';
                    }}
                    title="View agreement"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleUnarchiveAgreement(agreement.id)}
                    disabled={loading}
                    style={{
                      backgroundColor: loading ? '#9ca3af' : 'var(--accent)',
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
                        e.currentTarget.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = 'var(--accent)';
                      }
                    }}
                    title="Unarchive this agreement"
                  >
                    {loading ? 'Unarchiving...' : 'Unarchive'}
                  </button>
                  <button
                    onClick={() => handleDeleteAgreement(agreement.id)}
                    disabled={deletingAgreement[agreement.id]}
                    style={{
                      backgroundColor: deletingAgreement[agreement.id] ? '#9ca3af' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: deletingAgreement[agreement.id] ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!deletingAgreement[agreement.id]) {
                        e.currentTarget.style.backgroundColor = '#b91c1c';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!deletingAgreement[agreement.id]) {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }
                    }}
                    title="Permanently delete this archived agreement"
                  >
                    {deletingAgreement[agreement.id] ? 'Deleting...' : 'Delete'}
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
