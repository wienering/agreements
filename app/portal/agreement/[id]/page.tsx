'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'LIVE' | 'SIGNED' | 'COMPLETED' | 'CANCELLED' | 'VOID';
  expiresAt: string | null;
  createdAt: string;
  signedAt: string | null;
  cancelledAt: string | null;
  templateName: string;
  mergedHtml: string | null;
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

export default function AgreementDetail() {
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const router = useRouter();
  const params = useParams();
  const agreementId = params.id as string;

  // Fetch agreement data
  const fetchAgreementData = async () => {
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
  }, [agreementId, router]);

  // Activity tracking for session refresh
  useEffect(() => {
    const handleActivity = () => {
      const token = localStorage.getItem('portal_session_token');
      if (token) {
        // Refresh session on activity
        fetch('/api/agreements/portal/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {
          // If session refresh fails, redirect to login
          localStorage.removeItem('portal_session_token');
          router.push('/portal/login');
        });
      }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [router]);

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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    const token = localStorage.getItem('portal_session_token');

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
    const token = localStorage.getItem('portal_session_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/agreements/portal/export?agreementId=${agreementId}&format=${format}`, {
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
        setError('Failed to export agreement');
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
            <Link
              href="/portal/dashboard"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Agreement Details */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Agreement Content</h2>
            {agreement.mergedHtml ? (
              <div 
                className="prose max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: agreement.mergedHtml }}
              />
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

      {/* Notes Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Notes</h2>
        
        {/* Add Note Form */}
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

        {/* Notes List */}
        {agreement.notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">=���</div>
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
