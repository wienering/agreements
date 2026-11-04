const BACKDROP_TOOL_URL =
  process.env.BACKDROP_SELECTION_TOOL_URL ||
  process.env.NEXT_PUBLIC_BACKDROP_SELECTION_TOOL_URL ||
  'https://backdrops.photoboothguys.ca';

export type PublicBackdrop = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
};

/** The attendant's public backdrops from the backdrop tool. Throws on failure or timeout. */
export async function fetchPublicBackdrops(attendantId: string): Promise<PublicBackdrop[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${BACKDROP_TOOL_URL}/api/backdrops?attendantId=${encodeURIComponent(attendantId)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Backdrop tool responded ${response.status}`);
    const backdrops = await response.json();
    if (!Array.isArray(backdrops)) throw new Error('Invalid response from backdrop tool');
    return backdrops
      .filter((backdrop: { publicStatus?: boolean }) => backdrop.publicStatus === true)
      .map((backdrop: { id: string; name: string; description?: string | null; thumbnailUrl?: string | null }) => ({
        id: String(backdrop.id),
        name: backdrop.name,
        description: backdrop.description ?? null,
        thumbnailUrl: backdrop.thumbnailUrl ?? null,
      }));
  } finally {
    clearTimeout(timeoutId);
  }
}
