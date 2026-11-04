/**
 * Finding a lead's row in the Sheet and building the cell updates. Pure functions, so they're tested
 * without Google. Columns are found by header name, so moving columns around doesn't break the sync.
 */

export const SHEET_COLUMNS = {
  leadId: 'lead_id',
  email: 'email',
  newStatus: 'new status',
  nextFollowUp: 'next follow-up date',
} as const;

export type SheetColumnIndexes = Record<keyof typeof SHEET_COLUMNS, number>;

export function findSheetColumns(header: string[]): SheetColumnIndexes | null {
  const normalized = header.map((h) => (h ?? '').trim().toLowerCase());
  const indexes = {} as SheetColumnIndexes;
  for (const [key, name] of Object.entries(SHEET_COLUMNS) as Array<[keyof typeof SHEET_COLUMNS, string]>) {
    const index = normalized.indexOf(name);
    if (index === -1) return null;
    indexes[key] = index;
  }
  return indexes;
}

/**
 * Row number (1-based, as in A1 notation) of the lead's row: by lead_id first, otherwise the
 * last row with the same email (WF1 appends, so the last one is the newest). Null if not found.
 */
export function findLeadRow(
  rows: string[][],
  columns: SheetColumnIndexes,
  match: { sheetLeadId?: string | null; email?: string | null },
): number | null {
  const leadId = match.sheetLeadId?.trim();
  if (leadId) {
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][columns.leadId] ?? '').trim() === leadId) return i + 1;
    }
  }
  const email = match.email?.trim().toLowerCase();
  if (email) {
    for (let i = rows.length - 1; i >= 1; i--) {
      if ((rows[i][columns.email] ?? '').trim().toLowerCase() === email) return i + 1;
    }
  }
  return null;
}

/** Column letter for a 0-based index (0 → A, 25 → Z, 26 → AA). */
export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
