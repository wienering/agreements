'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UIcon } from '../../components/UIcon';
import { formatDateToronto, formatEventDateToronto } from '@/lib/dates';

interface Agreement {
  id: string;
  status: string;
  uniqueToken: string;
  createdAt: string;
  signedAt: string | null;
  expiresAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
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
  event: {
    eventName: string | null;
    eventDate: string | null;
  } | null;
  summary: {
    templateTitle: string;
    status: string;
    createdAt: string;
    signedAt: string | null;
    expiresAt: string | null;
    isExpired: boolean;
    canSign: boolean;
    isSigned: boolean;
    daysUntilExpiry: number | null;
  };
}

interface DashboardData {
  agreements: Agreement[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    statusSummary: Record<string, number>;
    availableStatuses: string[];
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    address: string | null;
    eventDate: string | null;
    eventType: string | null;
    eventLocation: string | null;
    eventPackage: string | null;
    packagePrice: number | null;
  };
  isAdminPreview?: boolean;
}

function PortalAdminPreviewContent() {
  // Set page title
  useEffect(() => {
    document.title = 'Admin Preview | Client Portal';
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const searchParams = useSearchParams();

  const fetchDashboardData = async () => {
    const email = searchParams.get('email');
    const clientId = searchParams.get('clientId');

    if (!email && !clientId) {
      setError('Email or Client ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (email) {
        params.append('email', email);
      } else if (clientId) {
        params.append('clientId', clientId);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const url = `/api/agreements/portal/admin-preview?${params.toString()}`;
      const response = await fetch(url);

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load portal data');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error fetching portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    // Refetch when filter changes
    if (!loading && data) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNED':
      case 'COMPLETED':
        return 'bg-panel text-success border border-hairline';
      case 'LIVE':
        return 'bg-panel text-ink border border-hairline';
      case 'DRAFT':
        return 'bg-panel text-warn border border-hairline';
      case 'CANCELLED':
      case 'VOID':
        return 'bg-panel text-alert border border-hairline';
      default:
        return 'bg-panel text-muted border border-hairline';
    }
  };

  const formatDate = (dateString: string) =>
    formatDateToronto(dateString, { year: 'numeric', month: 'short', day: 'numeric' });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted">Loading portal data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-lg bg-panel border border-alert p-6">
          <p className="text-alert">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-md bg-alert px-4 py-2 text-sm font-semibold text-white hover:bg-alert"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Find the most relevant agreement for next action display
  const relevantAgreement = data?.agreements.find(a => a.nextAction) || data?.agreements[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Admin Preview Banner */}
      <div className="mb-6 rounded-lg bg-panel border border-warn p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-warn">
              <UIcon name="search" className="text-xl" />
              Admin Preview Mode
            </h2>
            <p className="text-sm text-warn">
              Viewing portal as: {data?.client?.email || 'N/A'}
            </p>
          </div>
          <Link
            href="/admin/agreements"
            className="rounded-md bg-warn px-4 py-2 text-sm font-semibold text-white hover:bg-warn"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="client-page-title text-3xl font-bold text-ink">
          Client Portal — {data?.client?.firstName} {data?.client?.lastName}
        </h1>
        <div className="client-title-rule" aria-hidden="true" />
        <p className="mt-3 text-muted">
          Admin preview of client portal
        </p>
      </div>

      {data && (
        <>
          {/* Client Overview Section */}
          <div className="mb-8 rounded-lg border border-hairline bg-panel">
            <button
              onClick={() => setOverviewCollapsed(!overviewCollapsed)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-paper transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl text-muted">
                  <UIcon name="user" className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Event Overview
                  </h2>
                  <p className="text-sm text-muted">
                    {data.client.firstName} {data.client.lastName}
                    {data.client.eventDate && ` • ${formatEventDateToronto(data.client.eventDate)}`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-5 w-5 text-muted transition-transform ${overviewCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!overviewCollapsed && (
              <div className="border-t border-hairline p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Package Booked */}
                  {data.client.eventPackage && (
                    <div>
                      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <UIcon name="box" className="text-base" />
                        Package Booked
                      </h3>
                      <p className="text-lg font-semibold text-ink">{data.client.eventPackage}</p>
                      {data.client.packagePrice && (
                        <p className="text-sm text-muted">${data.client.packagePrice.toFixed(2)}</p>
                      )}
                    </div>
                  )}

                  {/* Payment Status */}
                  {relevantAgreement?.paymentStatus && (
                    <div>
                      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <UIcon name="credit-card" className="text-base" />
                        Payment Status
                      </h3>
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-panel text-ink">
                        {relevantAgreement.paymentStatus}
                      </span>
                      {relevantAgreement.stripePaymentLink && (
                        <a
                          href={relevantAgreement.stripePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-sm font-semibold text-ink underline underline-offset-2 hover:text-coral"
                        >
                          Make Payment →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Contact Method */}
                  <div>
                    <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                      <UIcon name="phone-call" className="text-base" />
                      Contact Method
                    </h3>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm text-ink">
                        <UIcon name="envelope" className="text-sm shrink-0" />
                        {data.client.email}
                      </p>
                      {data.client.phone && (
                        <p className="flex items-center gap-2 text-sm text-ink">
                          <UIcon name="smartphone" className="text-sm shrink-0" />
                          {data.client.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Event Location */}
                  {data.client.eventLocation && (
                    <div>
                      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <UIcon name="marker" className="text-base" />
                        Event Location
                      </h3>
                      <p className="text-sm text-ink">{data.client.eventLocation}</p>
                      {data.client.eventType && (
                        <p className="text-xs text-muted">{data.client.eventType}</p>
                      )}
                    </div>
                  )}

                  {/* Next Action - Full width */}
                  {relevantAgreement?.nextAction && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="rounded-lg bg-panel border border-warn p-4">
                        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-warn">
                          <UIcon name="bolt" className="text-base" />
                          Next Action
                        </h3>
                        <p className="text-base font-semibold text-warn">{relevantAgreement.nextAction}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-coral text-white'
                    : 'border border-hairline bg-panel text-ink hover:bg-paper'
                }`}
              >
                All ({data.pagination.totalCount})
              </button>
              {data.filters.availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    statusFilter === status
                      ? 'bg-coral text-white'
                      : 'border border-hairline bg-panel text-ink hover:bg-paper'
                  }`}
                >
                  {status} ({data.filters.statusSummary[status] || 0})
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search agreements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border border-hairline bg-panel px-3 py-2 text-sm placeholder:text-muted focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <button
                type="submit"
                className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Search
              </button>
            </form>
          </div>

          {/* Agreements List */}
          {data.agreements.length === 0 ? (
            <div className="rounded-lg border border-hairline bg-panel p-12 text-center">
              <div className="mb-4 flex justify-center text-4xl text-muted">
                <UIcon name="clipboard" className="text-4xl" />
              </div>
              <h3 className="text-lg font-medium text-ink mb-2">
                No Agreements Found
              </h3>
              <p className="text-muted">
                {statusFilter !== 'all' || searchQuery
                  ? 'Try adjusting your filters or search terms.'
                  : "This client doesn't have any agreements yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.agreements.map((agreement) => {
                const email = searchParams.get('email');
                const clientId = searchParams.get('clientId');
                const adminPreviewParams = `adminPreview=true&${email ? `email=${encodeURIComponent(email)}` : `clientId=${encodeURIComponent(clientId || data.client.id)}`}`;
                return (
                <div
                  key={agreement.id}
                  className="rounded-lg border border-hairline bg-panel"
                >
                  <Link
                    href={`/portal/agreement/${agreement.id}?${adminPreviewParams}`}
                    className="block p-6 transition hover:bg-paper"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-3">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-ink">
                              {agreement.summary.templateTitle}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                                agreement.status
                              )}`}
                            >
                              {agreement.status}
                            </span>
                          </div>

                          {/* Event Date - Prominently displayed right below title */}
                          {(agreement.event?.eventDate || data.client.eventDate) && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-2 text-base font-semibold text-coral">
                                <UIcon name="calendar" className="text-base" />
                                {formatEventDateToronto(agreement.event?.eventDate || data.client.eventDate!)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Event Name */}
                        {agreement.event?.eventName && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                              <UIcon name="star" className="text-sm" />
                              {agreement.event.eventName}
                            </span>
                          </div>
                        )}

                        {/* Activity Timeline */}
                        <div className="flex flex-wrap gap-3 text-sm text-muted mb-3">
                          <span className="inline-flex items-center gap-1.5">
                            <UIcon name="paper-plane" className="text-sm" />
                            Sent: {formatDate(agreement.createdAt)}
                          </span>
                          {agreement.firstViewedAt && (
                            <span className="inline-flex items-center gap-1.5">
                              • <UIcon name="eye" className="text-sm" />
                              Viewed: {formatDate(agreement.firstViewedAt)}
                            </span>
                          )}
                          {agreement.summary.signedAt && (
                            <span className="inline-flex items-center gap-1.5">
                              • <UIcon name="check" className="text-sm" />
                              Signed: {formatDate(agreement.summary.signedAt)}
                            </span>
                          )}
                        </div>

                        {/* Payment Status Badge */}
                        {agreement.paymentStatus && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-panel text-ink">
                              <UIcon name="credit-card" className="text-xs" />
                              {agreement.paymentStatus}
                            </span>
                          </div>
                        )}

                        {/* Gallery Link */}
                        {((agreement.galleryLinks && agreement.galleryLinks.length > 0) || agreement.galleryLink) && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                              <UIcon name="camera" className="text-sm" />
                              Gallery Available
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <svg
                          className="h-5 w-5 text-muted"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>

                  {/* Quick Actions */}
                  <div className="border-t border-hairline px-6 py-4 bg-paper">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/agreement/${agreement.uniqueToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <UIcon name="file" className="text-xs" />
                        View Agreement
                      </a>
                      
                      {agreement.summary.isSigned && (
                        <a
                          href={`/agreement/${agreement.uniqueToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                        >
                          <UIcon name="check" className="text-xs" />
                          View Signed Version
                        </a>
                      )}

                      {agreement.stripePaymentLink && (
                        <a
                          href={agreement.stripePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-coral hover:bg-paper"
                        >
                          <UIcon name="credit-card" className="text-xs" />
                          Make Payment
                        </a>
                      )}

                      {agreement.stripeReceiptLink && (
                        <a
                          href={agreement.stripeReceiptLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                        >
                          <UIcon name="receipt" className="text-xs" />
                          View Receipt
                        </a>
                      )}

                      <a
                        href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                      >
                        <UIcon name="palette" className="text-xs" />
                        Choose Template
                      </a>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PortalAdminPreview() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    }>
      <PortalAdminPreviewContent />
    </Suspense>
  );
}
