'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { AdminButton } from '../../components/AdminButton';

type Grant = {
  id: string;
  clientId: string;
  userEmail: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

export default function ConnectedAppsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Connected apps | Admin | Photobooth Guys';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/api/admin/mcp-grants');
      if (!response.ok) {
        setMessage('Could not load connected apps');
        return;
      }
      const data = await response.json();
      setEnabled(Boolean(data.enabled));
      setGrants(data.grants || []);
    } catch {
      setMessage('Could not load connected apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(grantId: string) {
    setMessage(null);
    const response = await adminFetch('/api/admin/mcp-grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grantId }),
    });
    if (!response.ok) {
      setMessage('Revoke failed');
      return;
    }
    setMessage('Grant revoked');
    await load();
  }

  async function revokeAll() {
    if (!window.confirm('Revoke all Claude MCP grants?')) return;
    setMessage(null);
    const response = await adminFetch('/api/admin/mcp-grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revokeAll: true }),
    });
    if (!response.ok) {
      setMessage('Revoke all failed');
      return;
    }
    setMessage('All grants revoked');
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-admin-text">Connected apps</h1>
        <p className="mt-1 text-sm text-admin-muted">
          OAuth grants for the Claude MCP connector. Kill switch: set MCP_ENABLED to anything other than
          true.
        </p>
      </div>

      {!enabled ? (
        <p className="rounded border border-admin-hairline bg-admin-surface px-4 py-3 text-sm text-admin-muted">
          MCP is currently disabled (MCP_ENABLED is not true).
        </p>
      ) : null}

      {message ? <p className="text-sm text-admin-text">{message}</p> : null}

      <div className="flex justify-end">
        <AdminButton type="button" onClick={revokeAll} disabled={grants.length === 0}>
          Revoke all
        </AdminButton>
      </div>

      {loading ? (
        <p className="text-sm text-admin-muted">Loading…</p>
      ) : grants.length === 0 ? (
        <p className="text-sm text-admin-muted">No active grants.</p>
      ) : (
        <ul className="space-y-3">
          {grants.map((grant) => (
            <li
              key={grant.id}
              className="rounded border border-admin-hairline bg-admin-surface p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-admin-text">{grant.clientId}</p>
                  <p className="text-admin-muted">{grant.userEmail}</p>
                  <p className="mt-1 text-admin-muted">
                    Scopes: {grant.scopes.join(', ') || '(none)'}
                  </p>
                  <p className="text-admin-muted">
                    Created: {new Date(grant.createdAt).toLocaleString()}
                  </p>
                  <p className="text-admin-muted">
                    Last used:{' '}
                    {grant.lastUsedAt ? new Date(grant.lastUsedAt).toLocaleString() : 'never'}
                  </p>
                </div>
                <AdminButton type="button" onClick={() => revoke(grant.id)}>
                  Revoke
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
