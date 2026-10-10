export type EventForSearch = {
  eventType?: string | null;
  eventLocation?: string | null;
  eventPackage?: string | null;
  notes?: string | null;
};

export type ClientForSearch = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  events?: EventForSearch[];
  // Deprecated client-level event fields, used only when the client has no events
  eventType?: string | null;
  eventLocation?: string | null;
  eventPackage?: string | null;
};

/** Words shorter than this many digits never match on digits-only phone comparison. */
const MIN_PHONE_DIGITS = 3;

export function tokenizeSearchQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function includesWord(value: string | null | undefined, word: string): boolean {
  return !!value && value.toLowerCase().includes(word);
}

function phoneMatches(phone: string | null | undefined, word: string): boolean {
  if (!phone) return false;
  if (phone.toLowerCase().includes(word)) return true;
  const wordDigits = word.replace(/\D/g, '');
  if (wordDigits.length < MIN_PHONE_DIGITS) return false;
  return phone.replace(/\D/g, '').includes(wordDigits);
}

function wordMatchesClient(client: ClientForSearch, word: string): boolean {
  const fullName = `${client.firstName} ${client.lastName}`;
  if (
    includesWord(fullName, word) ||
    includesWord(client.email, word) ||
    phoneMatches(client.phone, word) ||
    includesWord(client.notes, word)
  ) {
    return true;
  }
  if (client.events && client.events.length > 0) {
    return client.events.some(
      (event) =>
        includesWord(event.eventType, word) ||
        includesWord(event.eventLocation, word) ||
        includesWord(event.eventPackage, word) ||
        includesWord(event.notes, word),
    );
  }
  return (
    includesWord(client.eventType, word) ||
    includesWord(client.eventLocation, word) ||
    includesWord(client.eventPackage, word)
  );
}

/**
 * Case-insensitive client search. The query is split on whitespace and every
 * word must match at least one field, so "chris hill" matches first name
 * "Chris" plus last name "Hill".
 */
export function clientMatchesSearch(client: ClientForSearch, query: string): boolean {
  const words = tokenizeSearchQuery(query);
  return words.every((word) => wordMatchesClient(client, word));
}

export function filterClientsBySearch<T extends ClientForSearch>(clients: T[], query: string): T[] {
  const words = tokenizeSearchQuery(query);
  if (words.length === 0) return clients;
  return clients.filter((client) => words.every((word) => wordMatchesClient(client, word)));
}
