'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
    eventStartTime: string | null;
    eventDuration: string | null;
    eventPackage: string | null;
    packagePrice: number | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  'SIGNED': '#10b981',
  'COMPLETED': '#10b981',
  'LIVE': '#3b82f6',
  'DRAFT': '#eab308',
  'SENT': '#f59e0b',
  'CANCELLED': '#ef4444',
  'VOID': '#ef4444',
};

export default function PortalDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
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
    if (!loading) {
      fetchDashboardData();
    }
  }, [statusFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!data) return null;

    const pendingSignatures = data.agreements.filter(
      a => a.status === 'DRAFT' || a.status === 'SENT'
    ).length;

    const completed = data.agreements.filter(
      a => a.status === 'SIGNED' || a.status === 'COMPLETED'
    ).length;

    const expiringSoon = data.agreements.filter(
      a => a.summary.daysUntilExpiry !== null && 
           a.summary.daysUntilExpiry <= 7 && 
           !a.summary.isSigned
    ).length;

    return {
      total: data.pagination.totalCount,
      pendingSignatures,
      completed,
      expiringSoon,
    };
  }, [data]);

  // Prepare chart data
  const statusChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.filters.statusSummary).map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [data]);

  // Prepare timeline data (grouped by month)
  const timelineData = useMemo(() => {
    if (!data) return [];
    const grouped: Record<string, number> = {};
    
    data.agreements.forEach(agreement => {
      const date = new Date(agreement.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      grouped[monthKey] = (grouped[monthKey] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  }, [data]);

  // Prepare upcoming events
  const upcomingEvents = useMemo(() => {
    if (!data?.client.eventDate) return [];
    
    const eventDate = new Date(data.client.eventDate);
    if (isNaN(eventDate.getTime())) return [];

    return [{
      date: eventDate,
      eventDate: data.client.eventDate,
      eventStartTime: data.client.eventStartTime,
      eventType: data.client.eventType,
      eventLocation: data.client.eventLocation,
      daysUntil: Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }].filter(e => e.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [data]);

  // Prepare recent activity
  const recentActivity = useMemo(() => {
    if (!data) return [];

    const activities: Array<{
      type: string;
      date: Date;
      agreement: Agreement;
      label: string;
    }> = [];

    data.agreements.forEach(agreement => {
      if (agreement.createdAt) {
        activities.push({
          type: 'created',
          date: new Date(agreement.createdAt),
          agreement,
          label: `Agreement "${agreement.summary.templateTitle}" created`,
        });
      }
      if (agreement.summary.signedAt) {
        activities.push({
          type: 'signed',
          date: new Date(agreement.summary.signedAt),
          agreement,
          label: `Agreement "${agreement.summary.templateTitle}" signed`,
        });
      }
      if (agreement.lastViewedAt) {
        activities.push({
          type: 'viewed',
          date: new Date(agreement.lastViewedAt),
          agreement,
          label: `Viewed "${agreement.summary.templateTitle}"`,
        });
      }
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200';
      case 'LIVE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'SENT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200';
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

  const formatDateTime = (date: Date, time?: string | null) => {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (time) {
      return `${dateStr}, ${time}`;
    }
    return dateStr;
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

  const filteredAgreements = data?.agreements || [];
  const completionPercentage = metrics ? Math.round((metrics.completed / metrics.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1920px] px-6 py-8">
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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Agreement Links */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sticky top-6">
              {/* Filters */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSearch} className="mb-4">
                  <input
                    type="text"
                    placeholder="Search agreements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400"
                  />
                </form>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      statusFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All ({data.pagination.totalCount})
                  </button>
                  {data.filters.availableStatuses.slice(0, 3).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        statusFilter === status
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {status} ({data.filters.statusSummary[status] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Agreement List */}
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredAgreements.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    No agreements found
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredAgreements.map((agreement) => (
                      <Link
                        key={agreement.id}
                        href={`/portal/agreement/${agreement.id}`}
                        onClick={() => setSelectedAgreementId(agreement.id)}
                        className={`block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          selectedAgreementId === agreement.id ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {agreement.summary.templateTitle}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1.5 ${getStatusColor(
                                agreement.status
                              )}`}
                            >
                              {agreement.status}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {formatDate(agreement.createdAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Section - Metrics and Charts */}
          <div className="flex-1 min-w-0">
            {/* Metrics Cards */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Agreements</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.total}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Pending Signatures</div>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{metrics.pendingSignatures}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Completed</div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.completed}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Expiring Soon</div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics.expiringSoon}</div>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Status Distribution */}
              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status Distribution</h3>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-12">No data available</div>
                )}
              </div>

              {/* Timeline Chart */}
              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agreements Timeline</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs fill-slate-600 dark:fill-slate-400"
                      />
                      <YAxis 
                        className="text-xs fill-slate-600 dark:fill-slate-400"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'var(--tw-color-slate-900)',
                          border: '1px solid var(--tw-color-slate-700)',
                          borderRadius: '6px',
                          color: 'var(--tw-color-white)'
                        }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-12">No data available</div>
                )}
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Progress Overview</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-400">Completion Rate</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {filteredAgreements.filter(a => a.summary.daysUntilExpiry !== null && a.summary.daysUntilExpiry <= 7 && !a.summary.isSigned).length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/10 dark:border-amber-800">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Urgent Actions Required</h4>
                    <div className="space-y-2">
                      {filteredAgreements
                        .filter(a => a.summary.daysUntilExpiry !== null && a.summary.daysUntilExpiry <= 7 && !a.summary.isSigned)
                        .slice(0, 3)
                        .map((agreement) => (
                          <Link
                            key={agreement.id}
                            href={`/portal/agreement/${agreement.id}`}
                            className="block text-sm text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100"
                          >
                            {agreement.summary.templateTitle} - {agreement.summary.daysUntilExpiry} days left
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Upcoming Events & Recent Activity */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* Upcoming Events */}
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Events</h3>
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="p-4">
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.map((event, idx) => (
                      <div key={idx} className="border-l-4 border-emerald-500 pl-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDateTime(event.date, event.eventStartTime)}
                        </div>
                        {event.eventType && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {event.eventType}
                          </div>
                        )}
                        {event.eventLocation && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            📍 {event.eventLocation}
                          </div>
                        )}
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                          {event.daysUntil === 0 ? 'Today' : `${event.daysUntil} days away`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
                    No upcoming events
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
              </div>
              <div className="p-4">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, idx) => (
                      <Link
                        key={idx}
                        href={`/portal/agreement/${activity.agreement.id}`}
                        className="block text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1 h-2 w-2 rounded-full ${
                            activity.type === 'signed' ? 'bg-emerald-500' :
                            activity.type === 'created' ? 'bg-blue-500' :
                            'bg-slate-400'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-900 dark:text-white">{activity.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {formatDate(activity.date.toISOString())}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
