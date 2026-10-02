import { adminFetch } from '@/lib/adminFetch';
import type { Agreement } from '../_components/types';

export async function patchAgreement(id: string, body: Record<string, unknown>): Promise<Agreement> {
  const response = await adminFetch(`/api/agreements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Update failed';
    throw new Error(message);
  }
  return data as Agreement;
}
