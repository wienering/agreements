const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SUFFIX_LENGTH = 10;

export function slugifyAttendantGroupName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'group';
}

export function randomSlugSuffix(length = SUFFIX_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return suffix;
}

/** Name slug plus a random 10-character suffix, e.g. toronto-team-k3j9x2m7qa. */
export function buildAttendantGroupSlug(name: string): string {
  return `${slugifyAttendantGroupName(name)}-${randomSlugSuffix()}`;
}
