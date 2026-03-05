/**
 * Fetches the thumbnail URL for a backdrop from the backdrop selection tool.
 * Returns null on failure, timeout, or when the backdrop is not found.
 */
const BACKDROP_TOOL_URL =
  process.env.BACKDROP_SELECTION_TOOL_URL ||
  process.env.NEXT_PUBLIC_BACKDROP_SELECTION_TOOL_URL ||
  'https://backdrops.photoboothguys.ca';

const FETCH_TIMEOUT_MS = 5000;

export async function getBackdropThumbnailUrl(
  attendantId: string,
  backdropName: string
): Promise<string | null> {
  if (!attendantId || !backdropName) return null;

  const encodedAttendantId = encodeURIComponent(attendantId);
  const apiUrl = `${BACKDROP_TOOL_URL}/api/backdrops?attendantId=${encodedAttendantId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const backdrops = await response.json();
    if (!Array.isArray(backdrops)) return null;

    const match = backdrops.find(
      (b: { name: string; publicStatus?: boolean }) =>
        b.publicStatus === true && b.name === backdropName
    );

    const url = match?.thumbnailUrl;
    return typeof url === 'string' && url.trim() ? url : null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}
