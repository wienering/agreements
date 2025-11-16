'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'LIVE' | 'SIGNED' | 'COMPLETED' | 'CANCELLED' | 'VOID';
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
  const [isAgreementExpanded, setIsAgreementExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasMoreContent, setHasMoreContent] = useState(false);
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
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200';
      case 'LIVE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'CANCELLED':
      case 'VOID':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check content height after render to determine if accordion is needed
  useEffect(() => {
    if (contentRef.current && data?.agreement?.mergedHtml) {
      const element = contentRef.current;
      // Check if content height exceeds approximately 20 lines (30rem = ~480px)
      // Using a small delay to ensure content is fully rendered
      const checkHeight = () => {
        const maxHeight = 30 * 16; // 30rem in pixels (assuming 16px base)
        setHasMoreContent(element.scrollHeight > maxHeight);
      };
      
      // Check immediately and after a short delay to account for rendering
      checkHeight();
      const timeoutId = setTimeout(checkHeight, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      setHasMoreContent(false);
    }
  }, [data?.agreement?.mergedHtml]);

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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={fetchAgreementData}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>
              <Link
                href="/portal/dashboard"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/10 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">🔍 Admin Preview Mode</h2>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Viewing agreement as admin
              </p>
            </div>
            <Link
              href={`/portal/admin-preview?${searchParams.get('email') ? `email=${encodeURIComponent(searchParams.get('email')!)}` : `clientId=${encodeURIComponent(searchParams.get('clientId')!)}`}`}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {agreement.templateName}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
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
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Back to Portal Preview
              </Link>
            ) : (
              <Link
                href="/portal/dashboard"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Back to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/agreements/portal/pdf/${agreement.id}`}
            download
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            📥 Download PDF
          </a>

          {agreement.status === 'SIGNED' && (
            <a
              href={`/agreement/${agreement.uniqueToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ✅ View Signed Version
            </a>
          )}

          {agreement.stripePaymentLink && (
            <a
              href={agreement.stripePaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              💳 Make Payment
            </a>
          )}

          {agreement.stripeReceiptLink && (
            <a
              href={agreement.stripeReceiptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              🧾 View Receipt
            </a>
          )}

          <a
            href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            🎨 Choose Template
          </a>

          {agreement.backdropLink && (
            <a
              href={`${agreement.backdropLink.url}${agreement.backdropLink.url.includes('?') ? '&' : '?'}agreementId=${agreement.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              🖼️ Choose Your Backdrop
            </a>
          )}
        </div>
      </div>

      {/* Gallery Delivery Section */}
      {agreement.galleryLink && (
        <div className="mb-8 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-900/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">📸</div>
            <div>
              <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
                Your Event Gallery is Ready!
              </h2>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                View and download your event photos
              </p>
            </div>
          </div>
          <a
            href={agreement.galleryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
          >
            View Your Event Gallery →
          </a>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Activity Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="text-lg">📤</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">Agreement Sent</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(agreement.createdAt)}</p>
            </div>
          </div>

          {agreement.firstViewedAt && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <span className="text-lg">👁️</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">First Viewed</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(agreement.firstViewedAt)}</p>
                {agreement.viewCount > 1 && (
                  <p className="text-xs text-slate-500 dark:text-slate-500">Viewed {agreement.viewCount} times total</p>
                )}
              </div>
            </div>
          )}

          {agreement.signedAt && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">Agreement Signed</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(agreement.signedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agreement Details */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Agreement Content</h2>
            {agreement.mergedHtml ? (
              <div>
                <div 
                  ref={contentRef}
                  className={`prose max-w-none dark:prose-invert transition-all duration-300 ${
                    !isAgreementExpanded && hasMoreContent ? 'max-h-[30rem] overflow-hidden' : ''
                  }`}
                  style={!isAgreementExpanded && hasMoreContent ? {
                    maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)'
                  } : {}}
                  dangerouslySetInnerHTML={{ __html: agreement.mergedHtml }}
                />
                {hasMoreContent && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setIsAgreementExpanded(!isAgreementExpanded)}
                      className="flex items-center justify-center gap-2 w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span>{isAgreementExpanded ? 'Show Less' : 'Show More'}</span>
                      <svg
                        className={`h-5 w-5 transition-transform ${isAgreementExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">No content available for this agreement.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agreement Info */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agreement Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(agreement.status)}`}>
                  {agreement.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Created</p>
                <p className="text-sm text-slate-900 dark:text-white">{formatDate(agreement.createdAt)}</p>
              </div>
              {agreement.signedAt && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Signed</p>
                  <p className="text-sm text-slate-900 dark:text-white">{formatDate(agreement.signedAt)}</p>
                </div>
              )}
              {agreement.expiresAt && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Expires</p>
                  <p className="text-sm text-slate-900 dark:text-white">{formatDate(agreement.expiresAt)}</p>
                </div>
              )}
              {agreement.cancelledAt && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Cancelled</p>
                  <p className="text-sm text-slate-900 dark:text-white">{formatDate(agreement.cancelledAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Export</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Export as CSV
              </button>
            </div>
          </div>

          {/* Client Info */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Client Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</p>
                <p className="text-sm text-slate-900 dark:text-white">{client.firstName} {client.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</p>
                <p className="text-sm text-slate-900 dark:text-white">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone</p>
                  <p className="text-sm text-slate-900 dark:text-white">{client.phone}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Address</p>
                  <p className="text-sm text-slate-900 dark:text-white">{client.address}</p>
                </div>
              )}
              {client.eventDate && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Event Date</p>
                  <p className="text-sm text-slate-900 dark:text-white">{formatDate(client.eventDate)}</p>
                </div>
              )}
              {client.eventPackage && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Package</p>
                  <p className="text-sm text-slate-900 dark:text-white">{client.eventPackage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Center Section */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">📚 Resources & Links</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Helpful resources for your photobooth event
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
          >
            <div className="text-2xl">🎨</div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Template Chooser</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Browse and select your print template design</p>
            </div>
          </a>

          {agreement.selectedBackdropName ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20">
              <div className="text-2xl">✅</div>
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Selected Backdrop</h3>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mt-1">{agreement.selectedBackdropName}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Your backdrop selection has been confirmed</p>
              </div>
            </div>
          ) : agreement.backdropLink ? (
            <a
              href={`${agreement.backdropLink.url}${agreement.backdropLink.url.includes('?') ? '&' : '?'}agreementId=${agreement.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
            >
              <div className="text-2xl">🖼️</div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Choose Your Backdrop For Your Event</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Browse our backdrop options and make your selection</p>
              </div>
            </a>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="text-2xl">🖼️</div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Choose Your Backdrop</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Contact us for backdrop selection options</p>
              </div>
            </div>
          )}

          <a
            href="https://www.photoboothguys.ca/photobooth-questions/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
          >
            <div className="text-2xl">❓</div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">FAQ</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Frequently asked questions about our service</p>
            </div>
          </a>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-2xl">📋</div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Photo Booth Tips</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Tips for getting the best photos at your event</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Notes</h2>
        
        {/* Add Note Form - Hidden in admin preview mode */}
        {!isAdminPreview && (
        <form onSubmit={handleAddNote} className="mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Add a Note
              </label>
              <textarea
                id="note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add your note here..."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400"
              />
            </div>
            <button
              type="submit"
              disabled={addingNote || !newNote.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Notes Yet</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Add your first note using the form above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agreement.notes.map((note) => (
              <div key={note.id} className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{note.content}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <AgreementDetailContent />
    </Suspense>
  );
}
