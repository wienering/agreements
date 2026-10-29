const FORBIDDEN_KEYS = new Set([
  'uniqueToken',
  'signingToken',
  'signingLink',
  'otp',
  'otpCode',
  'code',
  'password',
  'sessionToken',
  'accessToken',
  'refreshToken',
  'signatureImage',
  'signatureData',
  'mergedHtml',
  'customHtmlContent',
  'nEXTAUTH_SECRET',
  'secret',
]);

export function assertNoForbiddenFields(value: unknown, path = ''): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (
      FORBIDDEN_KEYS.has(key) ||
      FORBIDDEN_KEYS.has(lower) ||
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('otp') ||
      lower.includes('uniquetoken') ||
      lower.includes('sessiontoken') ||
      lower.includes('signature')
    ) {
      throw new Error(`Forbidden field leaked in tool output: ${path ? `${path}.` : ''}${key}`);
    }
    assertNoForbiddenFields(child, path ? `${path}.${key}` : key);
  }
}

export function labelClientProvidedText(text: string | null | undefined): { clientProvidedText: string } | null {
  if (!text?.trim()) return null;
  return { clientProvidedText: text };
}
