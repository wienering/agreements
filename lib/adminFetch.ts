const CSRF_HEADER = 'X-Requested-With';
const CSRF_VALUE = 'agreements-admin';

/**
 * Fetch wrapper for admin UI calls to /api/ routes.
 * Injects the CSRF custom header without setting Content-Type (FormData uploads stay intact).
 */
export function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set(CSRF_HEADER, CSRF_VALUE);

  return fetch(input, {
    ...init,
    headers,
  });
}
