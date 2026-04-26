/**
 * Smart-field substitution for the client / signer name tokens used in
 * agreement templates. Pulled into a shared helper so every read/write path
 * (sign, verify-email, PDF, portal, admin preview, etc.) renders signer
 * names consistently.
 *
 * Behaviour summary:
 *  - When `secondSigner` is null/disabled, every `{{client.*}}` token renders
 *    the primary client's value (back-compat with existing templates).
 *  - When the agreement has a second signer enabled, name tokens auto-expand
 *    to include both signers:
 *      • `{{client.firstName}} {{client.lastName}}` (combined, with whitespace
 *        between) → "Alice Smith and Bob Jones"
 *      • `{{client.firstName}}` (alone) → "Alice and Bob"
 *      • `{{client.lastName}}` (alone) → "Smith and Jones"
 *  - `{{client.email}}` / `{{client.phone}}` always render the primary
 *    client's value (these are typically used for contact info; the
 *    secondary's data is available via the explicit tokens below).
 *  - Explicit second-signer tokens render an empty string when no second
 *    signer is configured:
 *      • `{{secondSigner.firstName}}`, `{{secondSigner.lastName}}`,
 *        `{{secondSigner.fullName}}`, `{{secondSigner.email}}`,
 *        `{{secondSigner.phone}}`
 *  - Convenience aggregates:
 *      • `{{client.fullName}}` → primary's "First Last"
 *      • `{{clients.fullNames}}` → "Alice Smith" or "Alice Smith and Bob Jones"
 *      • `{{clients.firstNames}}` → "Alice" or "Alice and Bob"
 *      • `{{clients.lastNames}}` → "Smith" or "Smith and Jones"
 */

export interface PrimarySigner {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface SecondSigner {
  enabled?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function applySignerSmartFields(
  html: string,
  primary: PrimarySigner | null | undefined,
  secondary: SecondSigner | null | undefined,
): string {
  if (!html) return html;

  const enabled = Boolean(secondary && secondary.enabled);

  const pFirst = primary?.firstName || '';
  const pLast = primary?.lastName || '';
  const pEmail = primary?.email || '';
  const pPhone = primary?.phone || '';

  const sFirst = enabled ? (secondary?.firstName || '') : '';
  const sLast = enabled ? (secondary?.lastName || '') : '';
  const sEmail = enabled ? (secondary?.email || '') : '';
  const sPhone = enabled ? (secondary?.phone || '') : '';

  const pFull = `${pFirst} ${pLast}`.trim();
  const sFull = `${sFirst} ${sLast}`.trim();

  const fullNames = enabled && sFull ? `${pFull} and ${sFull}` : pFull;
  const firstNames = enabled && sFirst ? `${pFirst} and ${sFirst}` : pFirst;
  const lastNames = enabled && sLast ? `${pLast} and ${sLast}` : pLast;

  let out = html;

  // 1) Combined pattern first so "{{client.firstName}} {{client.lastName}}"
  //    renders correctly as "Alice Smith and Bob Jones" (not "Alice and Bob
  //    Smith and Jones").
  out = out.replace(
    /\{\{\s*client\.firstName\s*\}\}\s+\{\{\s*client\.lastName\s*\}\}/g,
    fullNames,
  );

  // 2) Aggregate / convenience tokens.
  out = out.replace(/\{\{\s*client\.fullName\s*\}\}/g, pFull);
  out = out.replace(/\{\{\s*clients\.fullNames\s*\}\}/g, fullNames);
  out = out.replace(/\{\{\s*clients\.firstNames\s*\}\}/g, firstNames);
  out = out.replace(/\{\{\s*clients\.lastNames\s*\}\}/g, lastNames);

  // 3) Explicit second-signer tokens (empty string when no second signer).
  out = out.replace(/\{\{\s*secondSigner\.firstName\s*\}\}/g, sFirst);
  out = out.replace(/\{\{\s*secondSigner\.lastName\s*\}\}/g, sLast);
  out = out.replace(/\{\{\s*secondSigner\.fullName\s*\}\}/g, sFull);
  out = out.replace(/\{\{\s*secondSigner\.email\s*\}\}/g, sEmail);
  out = out.replace(/\{\{\s*secondSigner\.phone\s*\}\}/g, sPhone);

  // 4) Individual primary name tokens — auto-expand to both names when a
  //    second signer is enabled.
  out = out.replace(/\{\{\s*client\.firstName\s*\}\}/g, firstNames);
  out = out.replace(/\{\{\s*client\.lastName\s*\}\}/g, lastNames);

  // 5) Contact info tokens stay primary-only.
  out = out.replace(/\{\{\s*client\.email\s*\}\}/g, pEmail);
  out = out.replace(/\{\{\s*client\.phone\s*\}\}/g, pPhone);

  return out;
}

/**
 * Pull the second-signer fields off an Agreement-shaped object into the
 * normalized {@link SecondSigner} shape this helper expects. Tolerant of the
 * raw Prisma row shape and the reshaped `{ secondSigner: {...} }` shape that
 * verify-email / sign endpoints return to the client.
 */
export function pickSecondSigner(agreement: any): SecondSigner | null {
  if (!agreement) return null;

  if (!agreement.secondSignerEnabled) {
    // Front-end response shape sometimes carries a nested `secondSigner` object
    // even when not enabled at the row level — fall through to null.
    return null;
  }

  const nested = agreement.secondSigner;
  const firstName = nested?.firstName ?? agreement.secondSignerFirstName ?? '';
  const lastName = nested?.lastName ?? agreement.secondSignerLastName ?? '';
  const email = nested?.email ?? agreement.secondSignerEmail ?? '';
  const phone = nested?.phone ?? agreement.secondSignerPhone ?? '';

  return {
    enabled: true,
    firstName,
    lastName,
    email,
    phone,
  };
}
