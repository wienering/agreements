'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  nextAction: string | null;
  backdropLink: {
    id: string;
    name: string;
    url: string;
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
}

export default function PortalDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const router = useRouter();

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('portal_session_token');
    if (!token) {
      router.push('/portal/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const url = `/api/agreements/portal/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      } else if (response.status === 401) {
        localStorage.removeItem('portal_session_token');
        router.push('/portal/login');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load dashboard');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  useEffect(() => {
    // Refetch when filter changes
    if (!loading) {
      fetchDashboardData();
    }
  }, [statusFilter]);

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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome to your Client Portal
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Here are all your agreements with Photobooth Guys
        </p>
      </div>

      {data && (
        <>
          {/* Client Overview Section */}
          <div className="mb-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setOverviewCollapsed(!overviewCollapsed)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">👤</div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Your Event Overview
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {data.client.firstName} {data.client.lastName}
                    {data.client.eventDate && ` • ${new Date(data.client.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-5 w-5 text-slate-400 transition-transform ${overviewCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!overviewCollapsed && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Package Booked */}
                  {data.client.eventPackage && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">📦 Package Booked</h3>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{data.client.eventPackage}</p>
                      {data.client.packagePrice && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">${data.client.packagePrice.toFixed(2)}</p>
                      )}
                    </div>
                  )}

                  {/* Payment Status */}
                  {relevantAgreement?.paymentStatus && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">💳 Payment Status</h3>
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                        {relevantAgreement.paymentStatus}
                      </span>
                      {relevantAgreement.stripePaymentLink && (
                        <a
                          href={relevantAgreement.stripePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                          Make Payment →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Contact Method */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">📞 Contact Method</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-900 dark:text-white">✉️ {data.client.email}</p>
                      {data.client.phone && (
                        <p className="text-sm text-slate-900 dark:text-white">📱 {data.client.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Event Location */}
                  {data.client.eventLocation && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">📍 Event Location</h3>
                      <p className="text-sm text-slate-900 dark:text-white">{data.client.eventLocation}</p>
                      {data.client.eventType && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">{data.client.eventType}</p>
                      )}
                    </div>
                  )}

                  {/* Next Action - Full width */}
                  {relevantAgreement?.nextAction && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/10 dark:border-amber-800">
                        <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">⚡ Next Action</h3>
                        <p className="text-base font-semibold text-amber-900 dark:text-amber-100">{relevantAgreement.nextAction}</p>
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
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
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
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {status} ({data.filters.statusSummary[status] || 0})
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search agreements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Search
              </button>
            </form>
          </div>

          {/* Agreements List */}
          {data.agreements.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No Agreements Found
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                {statusFilter !== 'all' || searchQuery
                  ? 'Try adjusting your filters or search terms.'
                  : "You don't have any agreements yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.agreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <Link
                    href={`/portal/agreement/${agreement.id}`}
                    className="block p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
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

                        {/* Activity Timeline */}
                        <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400 mb-3">
                          <span>📤 Sent: {formatDate(agreement.createdAt)}</span>
                          {agreement.firstViewedAt && (
                            <span>• 👁️ Viewed: {formatDate(agreement.firstViewedAt)}</span>
                          )}
                          {agreement.summary.signedAt && (
                            <span>• ✅ Signed: {formatDate(agreement.summary.signedAt)}</span>
                          )}
                        </div>

                        {/* Payment Status Badge */}
                        {agreement.paymentStatus && (
                          <div className="mb-2">
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                              💳 {agreement.paymentStatus}
                            </span>
                          </div>
                        )}

                        {/* Gallery Link */}
                        {agreement.galleryLink && (
                          <div className="mb-2">
                            <span className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-400">
                              📸 Gallery Available
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <svg
                          className="h-5 w-5 text-slate-400"
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
                  <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/portal/agreement/${agreement.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        📄 View Details
                      </Link>
                      
                      {agreement.summary.isSigned && (
                        <a
                          href={`/agreement/${agreement.uniqueToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          ✅ View Signed Version
                        </a>
                      )}

                      {agreement.stripePaymentLink && (
                        <a
                          href={agreement.stripePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30"
                        >
                          💳 Make Payment
                        </a>
                      )}

                      {agreement.stripeReceiptLink && (
                        <a
                          href={agreement.stripeReceiptLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          🧾 View Receipt
                        </a>
                      )}

                      <a
                        href="https://www.photoboothguys.ca/photo-booth-templates-chooser/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        🎨 Choose Template
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={!data.pagination.hasPrev}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                disabled={!data.pagination.hasNext}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
