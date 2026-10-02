/** Statuses where the client has signed: SIGNED, and COMPLETED (signed, and the event is done). */
export const SIGNED_STATUSES = ['SIGNED', 'COMPLETED'] as const;

export function isSigned(status: string | null | undefined): boolean {
  return (SIGNED_STATUSES as readonly string[]).includes(status ?? '');
}
