'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UIcon } from '../../../components/UIcon';
import { AgreementDocument } from '@/app/components/agreement/AgreementDocument';
import { formatDateTimeToronto } from '@/lib/dates';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  expiresAt: string | null;
  createdAt: string;
  signedAt: string | null;
  cancelledAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  templateName: string;
  mergedHtml: string | null;
  paymentStatus: string | null;
  stripePaymentLink: string | null;
  stripeReceiptLink: string | null;
  galleryLink: string | null;
  galleryLinks?: Array<{ title: string; url: string }>;
  nextAction: string | null;
  backdropLink: {
    id: string;
    name: string;
    url: string;
  } | null;
  selectedBackdropName: string | null;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  phoneAddedAt: string | null;
  addressAddedAt: string | null;
  eventDate: string | null;
  eventType: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: number | null;
}

interface AgreementData {
  agreement: Agreement;
  client: Client;
}

function AgreementDetailContent() {
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const agreementId = params.id as string;

  // Check if we're in admin preview mode
  useEffect(() => {
    const adminPreview = searchParams.get('adminPreview') === 'true';
    setIsAdminPreview(adminPreview);
  }, [searchParams]);

  // Fetch agreement data
  const fetchAgreementData = async () => {
    // Check if we're in admin preview mode from search params
    const adminPreview = searchParams.get('adminPreview') === 'true';
    
    // If in admin preview mode, use admin preview API
    if (adminPreview) {
      const email = searchParams.get('email');
      const clientId = searchParams.get('clientId');
      
      if (!email && !clientId) {
        setError('Email or Client ID is required for admin preview');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) {
          params.append('email', email);
        } else if (clientId) {
          params.append('clientId', clientId);
        }
        
        const response = await fetch(`/api/agreements/portal/admin-preview/agreement/${agreementId}?${params.toString()}`);

        if (response.ok) {
          const agreementData = await response.json();
          setData(agreementData);
        } else if (response.status === 401 || response.status === 403) {
          setError('Admin access required');
        } else if (response.status === 404) {
          setError('Agreement not found');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load agreement' }));
          setError(errorData.error || 'Failed to load agreement');
        }
      } catch (error) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular portal flow - requires session token
    const token = localStorage.getItem('portal_session_token');
    if (!token) {
      router.push('/portal/login');
      return;
    }

    try {
      const response = await fetch(`/api/agreements/portal/agreement/${agreementId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const agreementData = await response.json();
        setData(agreementData);
      } else if (response.status === 401) {
        // Session expired
        localStorage.removeItem('portal_session_token');
        router.push('/portal/login');
      } else if (response.status === 404) {
        setError('Agreement not found');
      } else {
        setError('Failed to load agreement');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agreementId) {
      fetchAgreementData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, searchParams]);

  // Set page title when agreement data is loaded
  useEffect(() => {
    if (data?.agreement) {
      document.title = `${data.agreement.templateName} | Client Portal`;
    }
  }, [data?.agreement]);

  // Activity tracking for session refresh (throttled to prevent excessive calls)
  // Only run if not in admin preview mode
  useEffect(() => {
    if (isAdminPreview) return; // Skip session refresh in admin preview mode

    let lastRefresh = 0;
    const REFRESH_INTERVAL = 60000; // Only refresh once per minute

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRefresh < REFRESH_INTERVAL) {
        return; // Skip if we refreshed recently
      }

      const token = localStorage.getItem('portal_session_token');
      if (token) {
        lastRefresh = now;
        // Refresh session on activity - silently fail to avoid disrupting user
        fetch('/api/agreements/portal/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {
          // Silently fail on network errors to prevent logout on refresh
          console.debug('Session refresh failed (likely network issue)');
        });
      }
    };

    // Add throttled event listeners for user activity
    const events = ['mousedown', 'keypress', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [router, isAdminPreview]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNED':
      case 'COMPLETED':
        return 'bg-panel text-success border border-hairline';
      case 'SENT':
        return 'bg-panel text-ink border border-hairline';
      case 'DRAFT':
        return 'bg-panel text-warn border border-hairline';
      case 'CANCELLED':
        return 'bg-panel text-alert border border-hairline';
      default:
        return 'bg-panel text-muted border border-hairline';
    }
  };

  const formatDate = (dateString: string) =>
    formatDateTimeToronto(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    // Don't allow adding notes in admin preview mode
    if (isAdminPreview) {
      setError('Adding notes is not available in admin preview mode');
      return;
    }

    setAddingNote(true);
    const token = localStorage.getItem('portal_session_token');

    if (!token) {
      setError('Session token required');
      setAddingNote(false);
      return;
    }

    try {
      const response = await fetch('/api/agreements/portal/add-note', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newNote.trim(),
          agreementId: agreementId
        })
      });

      if (response.ok) {
        // Refresh agreement data
        await fetchAgreementData();
        setNewNote('');
      } else {
        setError('Failed to add note');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    // In admin preview mode, export is not available through portal API
    // Admins should use the admin interface for exports
    if (isAdminPreview) {
      setError('Export is not available in admin preview mode. Please use the admin interface.');
      return;
    }

    const token = localStorage.getItem('portal_session_token');
    if (!token) {
      setError('Session token required');
      return;
    }

    try {
      // For PDF export, we need to include HTML content
      const includeHtml = format === 'pdf';
      const response = await fetch(`/api/agreements/portal/export?agreementId=${agreementId}&format=${format}&includeHtml=${includeHtml}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agreement-${agreementId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to export agreement' }));
        setError(errorData.error || 'Failed to export agreement');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="rounded-lg bg-panel border border-alert p-6">
            <p className="text-alert">{error}</p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={fetchAgreementData}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
              >
                Try Again
              </button>
              <Link
                href="/portal/dashboard"
                className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { agreement, client } = data;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Admin Preview Banner */}
      {isAdminPreview && (
        <div className="mb-6 rounded-lg bg-panel border border-warn p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-warn">
                <UIcon name="search" className="text-xl" />
                Admin Preview Mode
              </h2>
              <p className="text-sm text-warn">
                Viewing agreement as admin
              </p>
            </div>
            <Link
              href={`/portal/admin-preview?${searchParams.get('email') ? `email=${encodeURIComponent(searchParams.get('email')!)}` : `clientId=${encodeURIComponent(searchParams.get('clientId')!)}`}`}
              className="rounded-md bg-warn px-4 py-2 text-sm font-semibold text-white hover:bg-warn"
            >
              Back to Portal Preview
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="client-page-title text-3xl font-bold text-ink">
              {agreement.templateName}
            </h1>
            <div className="client-title-rule" aria-hidden="true" />
            <p className="mt-3 text-muted">
              Agreement ID: {agreement.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(agreement.status)}`}>
              {agreement.status}
            </span>
            {isAdminPreview ? (
              <Link
                href={`/portal/admin-preview?${searchParams.get('email') ? `email=${encodeURIComponent(searchParams.get('email')!)}` : `clientId=${encodeURIComponent(searchParams.get('clientId')!)}`}`}
                className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Back to Portal Preview
              </Link>
            ) : (
              <Link
                href="/portal/dashboard"
                className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Back to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="mb-8 rounded-lg border border-hairline bg-panel p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/agreements/portal/pdf/${agreement.id}`}
            download
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:opacity-90"
          >
            <UIcon name="file-download" className="text-base" />
            Download PDF
          </a>

          {(agreement.status === 'SIGNED' || agreement.status === 'COMPLETED') && (
            <a
              href={`/agreement/${agreement.uniqueToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              <UIcon name="check" className="text-base" />
              View Signed Version
            </a>
          )}

          {agreement.stripePaymentLink && (
            <a
              href={agreement.stripePaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent"
            >
              <UIcon name="credit-card" className="text-base" />
              Make Payment
            </a>
          )}

          {agreement.stripeReceiptLink && (
            <a
              href={agreement.stripeReceiptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              <UIcon name="receipt" className="text-base" />
              View Receipt
            </a>
          )}

          <a
            href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            <UIcon name="palette" className="text-base" />
            Choose Template
          </a>

          {agreement.backdropLink && (
            <a
              href={`${agreement.backdropLink.url}${agreement.backdropLink.url.includes('?') ? '&' : '?'}agreementId=${agreement.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              <UIcon name="camera" className="text-base" />
              Choose Your Backdrop
            </a>
          )}
        </div>
      </div>

      {/* Gallery Delivery Section */}
      {((agreement.galleryLinks && agreement.galleryLinks.length > 0) || agreement.galleryLink) && (
        <div className="mb-8 rounded-lg border-2 border-hairline bg-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl text-accent">
              <UIcon name="camera" className="text-3xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Your Event {agreement.galleryLinks && agreement.galleryLinks.length > 1 ? 'Galleries Are' : 'Gallery is'} Ready!
              </h2>
              <p className="text-sm text-muted">
                View and download your event photos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(agreement.galleryLinks && agreement.galleryLinks.length > 0
              ? agreement.galleryLinks
              : [{ title: 'Photo Gallery', url: agreement.galleryLink! }]
            ).map((g, i) => (
              <a
                key={i}
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-accent-on hover:opacity-90"
              >
                View {g.title || 'Gallery'} →
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mb-8 rounded-lg border border-hairline bg-panel p-6">
        <h2 className="text-xl font-semibold text-ink mb-6">Activity Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-panel flex items-center justify-center text-accent">
              <UIcon name="paper-plane" className="text-lg" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink">Agreement Sent</p>
              <p className="text-sm text-muted">{formatDate(agreement.createdAt)}</p>
            </div>
          </div>

          {agreement.firstViewedAt && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-panel flex items-center justify-center text-accent">
              <UIcon name="eye" className="text-lg" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">First Viewed</p>
                <p className="text-sm text-muted">{formatDate(agreement.firstViewedAt)}</p>
                {agreement.viewCount > 1 && (
                  <p className="text-xs text-muted">Viewed {agreement.viewCount} times total</p>
                )}
              </div>
            </div>
          )}

          {agreement.signedAt && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-panel flex items-center justify-center text-success">
              <UIcon name="check" className="text-lg" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">Agreement Signed</p>
                <p className="text-sm text-muted">{formatDate(agreement.signedAt)}</p>
              </div>
            </div>
          )}

          {/* Payment Status / Balance Due */}
          {agreement.paymentStatus && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-panel flex items-center justify-center text-accent">
              <UIcon name="credit-card" className="text-lg" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink mb-2">Payment Status</p>
                {agreement.paymentStatus.toLowerCase().includes('balance due') || agreement.paymentStatus.toLowerCase().includes('balance') ? (
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-warn bg-panel border border-warn">
                    <UIcon name="credit-card" className="text-sm" />
                    {agreement.paymentStatus}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-panel text-ink">
                    <UIcon name="credit-card" className="text-sm" />
                    {agreement.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agreement Details */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AgreementDocument mode="readonly" html={agreement.mergedHtml} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agreement Info */}
          <div className="rounded-lg border border-hairline bg-panel p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Agreement Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-ink">Status</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(agreement.status)}`}>
                  {agreement.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Created</p>
                <p className="text-sm text-ink">{formatDate(agreement.createdAt)}</p>
              </div>
              {agreement.signedAt && (
                <div>
                  <p className="text-sm font-medium text-ink">Signed</p>
                  <p className="text-sm text-ink">{formatDate(agreement.signedAt)}</p>
                </div>
              )}
              {agreement.expiresAt && (
                <div>
                  <p className="text-sm font-medium text-ink">Expires</p>
                  <p className="text-sm text-ink">{formatDate(agreement.expiresAt)}</p>
                </div>
              )}
              {agreement.cancelledAt && (
                <div>
                  <p className="text-sm font-medium text-ink">Cancelled</p>
                  <p className="text-sm text-ink">{formatDate(agreement.cancelledAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="rounded-lg border border-hairline bg-panel p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Export</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-on hover:opacity-90"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Export as CSV
              </button>
            </div>
          </div>

          {/* Client Info */}
          <div className="rounded-lg border border-hairline bg-panel p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Client Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-ink">Name</p>
                <p className="text-sm text-ink">{client.firstName} {client.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Email</p>
                <p className="text-sm text-ink">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-sm font-medium text-ink">Phone</p>
                  <p className="text-sm text-ink">{client.phone}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <p className="text-sm font-medium text-ink">Address</p>
                  <p className="text-sm text-ink">{client.address}</p>
                </div>
              )}
              {client.eventDate && (
                <div>
                  <p className="text-sm font-medium text-ink">Event Date</p>
                  <p className="text-sm text-ink">{formatDate(client.eventDate)}</p>
                </div>
              )}
              {client.eventPackage && (
                <div>
                  <p className="text-sm font-medium text-ink">Package</p>
                  <p className="text-sm text-ink">{client.eventPackage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Center Section */}
      <div className="mb-8 rounded-lg border border-hairline bg-panel p-6">
        <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-semibold text-ink">
          <UIcon name="books" className="text-xl" />
          Resources & Links
        </h2>
        <p className="text-sm text-muted mb-6">
          Helpful resources for your photobooth event
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg border border-hairline hover:border-accent hover:bg-panel transition"
          >
            <div className="text-2xl text-muted">
              <UIcon name="palette" className="text-2xl" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Template Chooser</h3>
              <p className="text-sm text-muted">Browse and select your print template design</p>
            </div>
          </a>

          {agreement.selectedBackdropName ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-accent bg-panel">
              <div className="text-2xl text-accent">
                <UIcon name="check" className="text-2xl" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Selected Backdrop</h3>
                <p className="text-sm font-medium text-ink mt-1">{agreement.selectedBackdropName}</p>
                <p className="text-xs text-muted mt-1">Your backdrop selection has been confirmed</p>
              </div>
            </div>
          ) : agreement.backdropLink ? (
            <a
              href={`${agreement.backdropLink.url}${agreement.backdropLink.url.includes('?') ? '&' : '?'}agreementId=${agreement.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg border border-hairline hover:border-accent hover:bg-panel transition"
            >
              <div className="text-2xl text-muted">
                <UIcon name="camera" className="text-2xl" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Choose Your Backdrop For Your Event</h3>
                <p className="text-sm text-muted">Browse our backdrop options and make your selection</p>
              </div>
            </a>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-hairline bg-paper">
              <div className="text-2xl text-muted">
                <UIcon name="camera" className="text-2xl" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">Choose Your Backdrop</h3>
                <p className="text-sm text-muted">Contact us for backdrop selection options</p>
              </div>
            </div>
          )}

          <a
            href="https://www.photoboothguys.ca/photobooth-questions/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg border border-hairline hover:border-accent hover:bg-panel transition"
          >
            <div className="text-2xl text-muted">
              <UIcon name="question" className="text-2xl" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">FAQ</h3>
              <p className="text-sm text-muted">Frequently asked questions about our service</p>
            </div>
          </a>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-hairline bg-paper">
            <div className="text-2xl text-muted">
              <UIcon name="clipboard" className="text-2xl" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Photo Booth Tips</h3>
              <p className="text-sm text-muted">Tips for getting the best photos at your event</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-lg border border-hairline bg-panel p-6">
        <h2 className="text-xl font-semibold text-ink mb-6">Notes</h2>
        
        <div className="mb-6 rounded-md bg-paper border border-hairline p-3">
          <p className="text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <UIcon name="bulb" className="text-sm" />
              <strong>Note:</strong> Have a question or detail to share? Leave a note here and we&apos;ll see it.
            </span>
          </p>
        </div>
        
        {/* Add Note Form - Hidden in admin preview mode */}
        {!isAdminPreview && (
        <form onSubmit={handleAddNote} className="mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-ink mb-2">
                Add a Note
              </label>
              <textarea
                id="note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add your note here..."
                rows={3}
                className="w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={addingNote || !newNote.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover disabled:bg-panel disabled:text-muted disabled:cursor-not-allowed"
            >
              {addingNote ? 'Adding Note...' : 'Add Note'}
            </button>
          </div>
        </form>
        )}

        {/* Notes List */}
        {agreement.notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-ink mb-2">No Notes Yet</h3>
            <p className="text-muted">
              Add your first note using the form above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agreement.notes.map((note) => (
              <div key={note.id} className="rounded-md bg-paper p-4">
                <p className="text-sm text-ink mb-2">{note.content}</p>
                <p className="text-xs text-muted">
                  Added on {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgreementDetail() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    }>
      <AgreementDetailContent />
    </Suspense>
  );
}
