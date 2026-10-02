'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UIcon } from '@/app/components/UIcon';
import { formatDateToronto, formatEventDateToronto } from '@/lib/dates';

export interface PortalAgreement {
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

export interface PortalDashboardData {
  agreements: PortalAgreement[];
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
    isWhitelabelClient?: boolean;
  };
  isAdminPreview?: boolean;
}

type PortalDashboardProps = {
  mode: 'client' | 'adminPreview';
  adminEmail?: string | null;
  adminClientId?: string | null;
};

export function PortalDashboard({ mode, adminEmail = null, adminClientId = null }: PortalDashboardProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalDashboardData | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const pageRef = useRef(1);
  const router = useRouter();
  const isAdmin = mode === 'adminPreview';

  useEffect(() => {
    if (isAdmin) {
      document.title = 'Admin Preview | Client Portal';
      return;
    }
    if (data?.client) {
      document.title = `Dashboard - ${data.client.firstName} ${data.client.lastName} | Client Portal`;
    } else {
      document.title = 'Dashboard | Client Portal';
    }
  }, [isAdmin, data?.client]);

  const fetchDashboardData = async () => {
    let clientToken: string | null = null;
    if (isAdmin) {
      if (!adminEmail && !adminClientId) {
        setError('Email or Client ID is required');
        setLoading(false);
        return;
      }
    } else {
      clientToken = localStorage.getItem('portal_session_token');
      if (!clientToken) {
        router.push('/portal/login');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (isAdmin) {
        if (adminEmail) {
          params.append('email', adminEmail);
        } else if (adminClientId) {
          params.append('clientId', adminClientId);
        }
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (!isAdmin) {
        params.append('page', String(pageRef.current));
      }

      const url = isAdmin
        ? `/api/agreements/portal/admin-preview?${params.toString()}`
        : `/api/agreements/portal/dashboard${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(
        url,
        isAdmin
          ? undefined
          : {
              headers: {
                Authorization: `Bearer ${clientToken}`,
              },
            },
      );

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      } else if (!isAdmin && response.status === 401) {
        localStorage.removeItem('portal_session_token');
        router.push('/portal/login');
      } else {
        const errorData = await response.json();
        setError(errorData.error || (isAdmin ? 'Failed to load portal data' : 'Failed to load dashboard'));
      }
    } catch (fetchError) {
      setError('Network error. Please try again.');
      console.error(isAdmin ? 'Error fetching portal data:' : 'Error fetching dashboard:', fetchError);
    } finally {
      setLoading(false);
    }
  };

  const previewKey = isAdmin ? `${adminEmail ?? ''}|${adminClientId ?? ''}` : '';

  useEffect(() => {
    fetchDashboardData();
    // The client dashboard refetches when the router changes. Admin preview refetches when the client identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin ? previewKey : router]);

  useEffect(() => {
    if (isAdmin) {
      if (!loading && data) {
        fetchDashboardData();
      }
    } else if (!loading) {
      pageRef.current = 1;
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key === '/' && searchInputRef.current) {
        const target = event.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInputFocused) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) pageRef.current = 1;
    fetchDashboardData();
  };

  const loadPage = (nextPage: number) => {
    pageRef.current = nextPage;
    fetchDashboardData();
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <p className="text-muted">{isAdmin ? 'Loading portal data...' : 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-lg border border-alert bg-panel p-6">
          <p className="text-alert">{error}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const relevantAgreement = data?.agreements.find((agreement) => agreement.nextAction) || data?.agreements[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {isAdmin && (
        <div className="mb-6 rounded-lg border border-warn bg-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-warn">
                <UIcon name="search" className="text-xl" />
                Admin Preview Mode
              </h2>
              <p className="text-sm text-warn">Viewing portal as: {data?.client?.email || 'N/A'}</p>
            </div>
            <Link
              href="/admin/agreements"
              className="rounded-md bg-warn px-4 py-2 text-sm font-semibold text-white hover:bg-warn"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="client-page-title text-3xl font-bold text-ink">
          {isAdmin
            ? `Client Portal — ${data?.client?.firstName ?? ''} ${data?.client?.lastName ?? ''}`
            : 'Welcome to your Client Portal'}
        </h1>
        <div className="client-title-rule" aria-hidden="true" />
        <p className="mt-3 text-muted">
          {isAdmin ? 'Admin preview of client portal' : 'Here are all your agreements with Photobooth Guys'}
        </p>
      </div>

      {data && (
        <>
          <div className="mb-8 rounded-lg border border-hairline bg-panel">
            <button
              type="button"
              onClick={() => setOverviewCollapsed(!overviewCollapsed)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-paper"
            >
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <div className="text-2xl text-muted">
                    <UIcon name="user" className="text-2xl" />
                  </div>
                ) : (
                  <UIcon name="user" className="text-2xl text-accent" />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-ink">{isAdmin ? 'Event Overview' : 'Your Event Overview'}</h2>
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

                  {relevantAgreement?.paymentStatus && (
                    <div>
                      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <UIcon name="credit-card" className="text-base" />
                        Payment Status
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-panel px-3 py-1 text-sm font-medium text-ink">
                        {relevantAgreement.paymentStatus}
                      </span>
                      {relevantAgreement.stripePaymentLink && (
                        <a
                          href={relevantAgreement.stripePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-sm font-semibold text-ink underline underline-offset-2 hover:text-accent"
                        >
                          Make Payment →
                        </a>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                      <UIcon name="phone-call" className="text-base" />
                      Contact Method
                    </h3>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm text-ink">
                        <UIcon name="envelope" className="shrink-0 text-sm" />
                        {data.client.email}
                      </p>
                      {data.client.phone && (
                        <p className="flex items-center gap-2 text-sm text-ink">
                          <UIcon name="smartphone" className="shrink-0 text-sm" />
                          {data.client.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {data.client.eventLocation && (
                    <div>
                      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <UIcon name="marker" className="text-base" />
                        Event Location
                      </h3>
                      <p className="text-sm text-ink">{data.client.eventLocation}</p>
                      {data.client.eventType && <p className="text-xs text-muted">{data.client.eventType}</p>}
                    </div>
                  )}

                  {relevantAgreement?.nextAction && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="rounded-lg border border-warn bg-panel p-4">
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

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-accent text-accent-on'
                    : 'border border-hairline bg-panel text-ink hover:bg-paper'
                }`}
              >
                All ({data.pagination.totalCount})
              </button>
              {data.filters.availableStatuses.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    statusFilter === status
                      ? 'bg-accent text-accent-on'
                      : 'border border-hairline bg-panel text-ink hover:bg-paper'
                  }`}
                >
                  {status} ({data.filters.statusSummary[status] || 0})
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search agreements..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-md border border-hairline bg-panel px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:opacity-90"
              >
                Search
              </button>
            </form>
          </div>

          {data.agreements.length === 0 ? (
            <div className="rounded-lg border border-hairline bg-panel p-12 text-center">
              <div className="mb-4 flex justify-center text-4xl text-muted">
                <UIcon name="clipboard" className="text-4xl" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-ink">No Agreements Found</h3>
              <p className="text-muted">
                {statusFilter !== 'all' || searchQuery
                  ? 'Try adjusting your filters or search terms.'
                  : isAdmin
                    ? "This client doesn't have any agreements yet."
                    : "You don't have any agreements yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.agreements.map((agreement) => {
                const detailHref = isAdmin
                  ? `/portal/agreement/${agreement.id}?adminPreview=true&${
                      adminEmail
                        ? `email=${encodeURIComponent(adminEmail)}`
                        : `clientId=${encodeURIComponent(adminClientId || data.client.id)}`
                    }`
                  : `/portal/agreement/${agreement.id}`;
                return (
                  <div key={agreement.id} className="rounded-lg border border-hairline bg-panel">
                    <Link href={detailHref} className="block p-6 transition hover:bg-paper">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="mb-2 flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-ink">{agreement.summary.templateTitle}</h3>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                                  agreement.status,
                                )}`}
                              >
                                {agreement.status}
                              </span>
                            </div>

                            {(agreement.event?.eventDate || data.client.eventDate) && (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-2 text-base font-semibold text-accent">
                                  <UIcon name="calendar" className="text-base" />
                                  {formatEventDateToronto(agreement.event?.eventDate || data.client.eventDate!)}
                                </span>
                              </div>
                            )}
                          </div>

                          {agreement.event?.eventName && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                                <UIcon name="star" className="text-sm" />
                                {agreement.event.eventName}
                              </span>
                            </div>
                          )}

                          {!isAdmin && data.client.isWhitelabelClient && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-ink">
                                <UIcon name="building" className="text-xs" />
                                Whitelabel Client
                              </span>
                            </div>
                          )}

                          <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <UIcon name="paper-plane" className="text-sm" />
                              Sent: {formatPortalDate(agreement.createdAt)}
                            </span>
                            {agreement.firstViewedAt && (
                              <span className="inline-flex items-center gap-1.5">
                                • <UIcon name="eye" className="text-sm" />
                                Viewed: {formatPortalDate(agreement.firstViewedAt)}
                              </span>
                            )}
                            {agreement.summary.signedAt && (
                              <span className="inline-flex items-center gap-1.5">
                                • <UIcon name="check" className="text-sm" />
                                Signed: {formatPortalDate(agreement.summary.signedAt)}
                              </span>
                            )}
                          </div>

                          {agreement.paymentStatus && (
                            <div className="mb-2">
                              <PaymentPill status={agreement.paymentStatus} emphasizeBalance={!isAdmin} />
                            </div>
                          )}

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
                          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>

                    <div className="border-t border-hairline bg-paper px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {isAdmin ? (
                          <a
                            href={`/agreement/${agreement.uniqueToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-on hover:opacity-90"
                          >
                            <UIcon name="file" className="text-xs" />
                            View Agreement
                          </a>
                        ) : (
                          <Link
                            href={`/portal/agreement/${agreement.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-on hover:opacity-90"
                          >
                            <UIcon name="file" className="text-xs" />
                            View Details
                          </Link>
                        )}

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
                            className="inline-flex items-center gap-1 rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-accent hover:bg-paper"
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

          {!isAdmin && data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={!data.pagination.hasPrev}
                onClick={() => loadPage(data.pagination.page - 1)}
                className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:text-muted"
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!data.pagination.hasNext}
                onClick={() => loadPage(data.pagination.page + 1)}
                className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:text-muted"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusBadgeClass(status: string) {
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
}

function formatPortalDate(dateString: string) {
  return formatDateToronto(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
}

function PaymentPill({ status, emphasizeBalance }: { status: string; emphasizeBalance: boolean }) {
  const balance =
    emphasizeBalance &&
    (status.toLowerCase().includes('balance due') || status.toLowerCase().includes('balance'));

  if (balance) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warn bg-panel px-2.5 py-1 text-xs font-semibold text-warn">
        <UIcon name="credit-card" className="text-xs" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-ink">
      <UIcon name="credit-card" className="text-xs" />
      {status}
    </span>
  );
}
