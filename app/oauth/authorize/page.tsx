'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';

function AuthorizeInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return {
      client_id: params.get('client_id') || '',
      redirect_uri: params.get('redirect_uri') || '',
      state: params.get('state') || '',
      code_challenge: params.get('code_challenge') || '',
      code_challenge_method: params.get('code_challenge_method') || '',
      scope: params.get('scope') || 'read',
      response_type: params.get('response_type') || '',
    };
  }, [searchParams]);

  useEffect(() => {
    document.title = 'Authorize Claude | Photobooth Guys';
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = `/oauth/authorize?${searchParams.toString()}`;
      router.replace(`/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, searchParams]);

  const scopes = (query.scope || 'read').split(/[\s+]+/).filter(Boolean);

  async function onApprove() {
    setApproving(true);
    setError(null);
    try {
      const response = await adminFetch('/api/oauth/authorize/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: query.client_id,
          redirect_uri: query.redirect_uri,
          state: query.state,
          code_challenge: query.code_challenge,
          code_challenge_method: query.code_challenge_method,
          scope: query.scope,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Authorization failed');
        setApproving(false);
        return;
      }
      window.location.href = data.redirectTo;
    } catch {
      setError('Authorization failed');
      setApproving(false);
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <p className="text-sm text-admin-muted">Checking admin session…</p>;
  }

  return (
    <div className="mx-auto max-w-lg rounded border border-admin-hairline bg-admin-surface p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-admin-text">Authorize Claude</h1>
      <p className="mt-2 text-sm text-admin-muted">
        Signed in as <span className="text-admin-text">{session?.user?.email}</span>
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-admin-text">Client</dt>
          <dd className="text-admin-muted">{query.client_id || '(missing)'}</dd>
        </div>
        <div>
          <dt className="font-medium text-admin-text">Redirect</dt>
          <dd className="break-all text-admin-muted">{query.redirect_uri || '(missing)'}</dd>
        </div>
        <div>
          <dt className="font-medium text-admin-text">Scopes</dt>
          <dd className="text-admin-muted">
            {scopes.length ? scopes.join(', ') : 'read'}
            {scopes.includes('write')
              ? ' — write lets Claude create/update clients, notes, drafts, and payment status'
              : ''}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-4 rounded border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onApprove}
          disabled={approving}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {approving ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (query.redirect_uri) {
              const url = new URL(query.redirect_uri);
              url.searchParams.set('error', 'access_denied');
              if (query.state) url.searchParams.set('state', query.state);
              window.location.href = url.toString();
            } else {
              window.location.href = '/admin';
            }
          }}
          className="rounded border border-admin-hairline px-4 py-2 text-sm text-admin-text"
        >
          Deny
        </button>
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <div data-surface="admin" className="min-h-screen bg-admin-bg px-4 py-16 text-admin-text">
      <Suspense fallback={<p className="text-center text-sm text-admin-muted">Loading…</p>}>
        <AuthorizeInner />
      </Suspense>
    </div>
  );
}
