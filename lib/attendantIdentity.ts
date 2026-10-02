/** Prisma default cuid: 'c' + 24 lowercase alphanumeric chars (25 total). */
const ATTENDANT_CUID_RE = /^c[a-z0-9]{24}$/;

const TOKEN_BOUNDARY = '(?=[/?&#]|$)';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidAttendantCuid(id: string): boolean {
  return ATTENDANT_CUID_RE.test(id);
}

/** True when url contains /select/{id} or attendantId={id} with id bounded (no prefix match). */
export function urlContainsBoundedAttendantId(url: string, attendantId: string): boolean {
  const variants = [attendantId, encodeURIComponent(attendantId)];
  for (const id of variants) {
    const escaped = escapeRegExp(id);
    if (new RegExp(`/select/${escaped}${TOKEN_BOUNDARY}`).test(url)) return true;
    if (new RegExp(`attendantId=${escaped}${TOKEN_BOUNDARY}`).test(url)) return true;
  }
  return false;
}

/**
 * The backdrop-tool attendant ID in a backdrop link URL (/select/{id} or ?attendantId={id}),
 * or null when the URL has none or it isn't a valid ID.
 */
export function attendantIdFromBackdropUrl(url: string): string | null {
  const pathMatch = url.match(/\/select\/([^/?#&]+)/);
  let candidate: string | null = null;
  if (pathMatch) {
    try {
      candidate = decodeURIComponent(pathMatch[1]);
    } catch {
      candidate = pathMatch[1];
    }
  } else {
    try {
      candidate = new URL(url).searchParams.get('attendantId');
    } catch {
      candidate = null;
    }
  }
  return candidate && isValidAttendantCuid(candidate) ? candidate : null;
}

export function backdropLinkContainsAnyBoundedAttendantId(
  url: string,
  attendantIds: string[]
): boolean {
  return attendantIds.some((id) => urlContainsBoundedAttendantId(url, id));
}

/** Coarse Prisma contains prefilter (unchanged shape). */
export function backdropLinkUrlConditionsForAttendant(attendantId: string) {
  const encodedAttendantId = encodeURIComponent(attendantId);
  return [
    { url: { contains: `/select/${attendantId}` } },
    { url: { contains: `attendantId=${attendantId}` } },
    { url: { contains: `/select/${encodedAttendantId}` } },
    { url: { contains: `attendantId=${encodedAttendantId}` } },
  ];
}
