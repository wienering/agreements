import { splitName } from '@/lib/bookly/mapping';

export function splitClientName(name: string): { firstName: string; lastName: string } {
  const { firstName, lastName } = splitName(name);
  const first = firstName.trim() || name.trim();
  const last = lastName.trim() || '-';
  return { firstName: first, lastName: last };
}

export function normalizeNameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, '');
}

/** Same email (exact) or very similar full name (exact normalized, or shared last + close first). */
export function isLikelyDuplicateClient(
  candidate: { firstName: string; lastName: string; email: string },
  existing: { firstName: string; lastName: string; email: string },
): boolean {
  if (candidate.email.toLowerCase() === existing.email.toLowerCase()) {
    return true;
  }

  const a = normalizeNameKey(candidate.firstName, candidate.lastName);
  const b = normalizeNameKey(existing.firstName, existing.lastName);
  if (!a || !b) return false;
  if (a === b) return true;

  const candLast = candidate.lastName.trim().toLowerCase();
  const existLast = existing.lastName.trim().toLowerCase();
  if (candLast && existLast && candLast === existLast) {
    const candFirst = candidate.firstName.trim().toLowerCase();
    const existFirst = existing.firstName.trim().toLowerCase();
    if (candFirst && existFirst && (candFirst.startsWith(existFirst) || existFirst.startsWith(candFirst))) {
      return true;
    }
  }

  return levenshtein(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.15));
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}
