'use client';

import { adminFetch } from '@/lib/adminFetch';
import { formatDateToronto } from '@/lib/dates';
import { agreementStatusLabel } from '@/lib/agreementStatus';
import { useState, useEffect } from 'react';
import { AdminButton } from '../../../components/AdminButton';
import { useRouter } from 'next/navigation';
import { useToast } from '../../../components/Toast';
import { UIcon } from '../../../components/UIcon';
import {
  StatusBadge,
  agreementStatusToBadgeVariant,
} from '../../../components/StatusBadge';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'SENT' | 'LIVE' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
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
  useEffect(() => {
    document.title = 'Archived Agreements | Admin | Photobooth Guys';
  }, []);

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const [deletingAgreement, setDeletingAgreement] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchArchivedAgreements();
  }, []);

  const fetchArchivedAgreements = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/agreements/archived');
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
      setUnarchivingId(agreementId);
      const response = await adminFetch('/api/agreements/archive', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId }),
      });

      if (response.ok) {
        showToast('Agreement unarchived successfully', 'success');
        fetchArchivedAgreements();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to unarchive agreement', 'error');
      }
    } catch (error) {
      console.error('Error unarchiving agreement:', error);
      showToast('Error unarchiving agreement', 'error');
    } finally {
      setUnarchivingId(null);
    }
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to permanently delete this archived agreement? This action cannot be undone.')) {
      return;
    }

    setDeletingAgreement(prev => ({ ...prev, [agreementId]: true }));
    try {
      const response = await adminFetch(`/api/agreements/delete`, {
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

  const mainBg = 'var(--admin-bg)';
  const cardBg = 'var(--admin-surface)';
  const textColor = 'var(--admin-text)';
  const mutedText = 'var(--admin-muted)';
  const borderColor = 'var(--admin-hairline)';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: mainBg,
      padding: isMobile ? '16px' : '24px',
    }}>
      <ToastContainer />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '0',
        }}>
          <div>
            <h1 className="admin-page-title" style={{
              margin: '0',
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: '700',
              color: textColor,
            }}>
              Archived Agreements
            </h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p style={{
              margin: '8px 0 0 0',
              color: mutedText,
              fontSize: '16px',
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

        {loading ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '2px',
            padding: '48px 24px',
            textAlign: 'center',
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
            borderRadius: '2px',
            padding: '48px 24px',
            textAlign: 'center',
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
                borderRadius: '2px',
                padding: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '12px' : '0',
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor, fontWeight: '600' }}>
                      {agreement.template.title}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.client.firstName} {agreement.client.lastName} ({agreement.client.email})
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      Archived: {formatDateToronto(agreement.archivedAt)}
                    </p>
                  </div>
                  <StatusBadge variant={agreementStatusToBadgeVariant(agreement.status)}>
                    {agreementStatusLabel(agreement.status)}
                  </StatusBadge>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  <AdminButton
                    variant="primary"
                    size="compact"
                    onClick={() => window.open(`/agreement/${agreement.uniqueToken}`, '_blank')}
                    title="View agreement"
                  >
                    View
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    size="compact"
                    disabled={unarchivingId === agreement.id}
                    onClick={() => handleUnarchiveAgreement(agreement.id)}
                    title="Unarchive this agreement"
                  >
                    {unarchivingId === agreement.id ? 'Unarchiving...' : 'Unarchive'}
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    size="compact"
                    disabled={deletingAgreement[agreement.id]}
                    onClick={() => handleDeleteAgreement(agreement.id)}
                    title="Permanently delete this archived agreement"
                  >
                    {deletingAgreement[agreement.id] ? 'Deleting...' : 'Delete'}
                  </AdminButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
