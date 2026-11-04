import {
  addTorontoCalendarDaysFrom,
  toTorontoDateTimeLocalInput,
  torontoCalendarDaysBetween,
} from '@/lib/dates';
import { displayPaymentStatus } from '@/lib/paymentStatus';
import type { Agreement, BackdropLinkOption, GalleryLink } from './types';
import { DOUBLE_BOOKED_FILTER, NO_ATTENDANT_FILTER } from './types';

/** The attendant record's name, falling back to the backdrop link name. */
export function getAgreementAttendantName(agreement: Agreement): string | undefined {
  const name = agreement.backdropLink?.attendant?.name?.trim() || agreement.backdropLink?.name?.trim();
  return name || undefined;
}

/** Name to show for a backdrop link in pickers: the attendant's name, flagged when inactive. */
export function backdropLinkLabel(link: BackdropLinkOption): string {
  const attendant = link.attendant;
  if (!attendant) return link.name;
  const name = attendant.name === link.name ? attendant.name : `${attendant.name} (${link.name})`;
  return attendant.active ? name : `${name} — inactive`;
}

/** Attendant filter value: the attendant when the link has one, otherwise the link itself. */
export function attendantFilterValue(link: BackdropLinkOption): string {
  return link.attendantId ? `attendant:${link.attendantId}` : `link:${link.id}`;
}

/** One filter option per attendant (or per unlinked backdrop link), sorted by name. */
export function attendantFilterOptions(links: BackdropLinkOption[]): { value: string; label: string }[] {
  const options = new Map<string, string>();
  for (const link of links) {
    const value = attendantFilterValue(link);
    if (options.has(value)) continue;
    const label = link.attendant
      ? `${link.attendant.name}${link.attendant.active ? '' : ' — inactive'}`
      : link.name;
    options.set(value, label);
  }
  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function agreementMissingAttendant(agreement: Agreement): boolean {
  return agreement.status !== 'CANCELLED' && !getAgreementAttendantName(agreement);
}

/** The dropdown value for a stored payment status; '' when blank. */
export function paymentStatusSelectValue(value?: string | null) {
  return displayPaymentStatus(value) ?? '';
}

export function getDefaultExpirationDate() {
  return toTorontoDateTimeLocalInput(addTorontoCalendarDaysFrom(new Date(), 14));
}

export function extractAttendantIdFromUrl(url: string): string | null {
  try {
    const pathMatch = url.match(/\/select\/([^/?]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    const urlObj = new URL(url);
    const attendantIdParam = urlObj.searchParams.get('attendantId');
    if (attendantIdParam) return attendantIdParam;

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const selectIndex = pathSegments.indexOf('select');
    if (selectIndex !== -1 && pathSegments[selectIndex + 1]) {
      return pathSegments[selectIndex + 1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting attendant ID from URL:', error);
    return null;
  }
}

export function eventTime(agreement: Agreement): number {
  const raw = agreement.event?.eventDate || agreement.client.eventDate;
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

export function agreementMatchesSearch(agreement: Agreement, searchLower: string): boolean {
  if (
    agreement.client.firstName.toLowerCase().includes(searchLower) ||
    agreement.client.lastName.toLowerCase().includes(searchLower) ||
    agreement.client.email.toLowerCase().includes(searchLower)
  ) {
    return true;
  }
  if (agreement.template.title.toLowerCase().includes(searchLower)) return true;
  if (agreement.event) {
    if (
      (agreement.event.eventType && agreement.event.eventType.toLowerCase().includes(searchLower)) ||
      (agreement.event.eventLocation && agreement.event.eventLocation.toLowerCase().includes(searchLower)) ||
      (agreement.event.eventPackage && agreement.event.eventPackage.toLowerCase().includes(searchLower))
    ) {
      return true;
    }
  }
  const attendantName = getAgreementAttendantName(agreement);
  if (attendantName && attendantName.toLowerCase().includes(searchLower)) return true;
  if (agreement.status.toLowerCase().includes(searchLower)) return true;
  return false;
}

export function filterAgreements(
  agreements: Agreement[],
  statusFilter: string,
  attendantFilter: string,
  debouncedSearchTerm: string,
  doubleBookedIds: ReadonlySet<string> = new Set(),
): Agreement[] {
  let filtered = agreements;
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((agreement) => agreement.status === statusFilter);
  }
  if (attendantFilter === NO_ATTENDANT_FILTER) {
    filtered = filtered.filter((agreement) => !getAgreementAttendantName(agreement));
  } else if (attendantFilter === DOUBLE_BOOKED_FILTER) {
    filtered = filtered.filter((agreement) => doubleBookedIds.has(agreement.id));
  } else if (attendantFilter.startsWith('attendant:')) {
    const attendantId = attendantFilter.slice('attendant:'.length);
    filtered = filtered.filter((agreement) => agreement.backdropLink?.attendantId === attendantId);
  } else if (attendantFilter.startsWith('link:')) {
    const linkId = attendantFilter.slice('link:'.length);
    filtered = filtered.filter((agreement) => agreement.backdropLink?.id === linkId);
  } else if (attendantFilter !== 'ALL') {
    filtered = filtered.filter((agreement) => agreement.backdropLink?.id === attendantFilter);
  }
  if (debouncedSearchTerm.trim()) {
    const searchLower = debouncedSearchTerm.toLowerCase();
    filtered = filtered.filter((agreement) => agreementMatchesSearch(agreement, searchLower));
  }
  return [...filtered].sort((a, b) => eventTime(a) - eventTime(b));
}

export function formatEventRelative(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const diffDays = torontoCalendarDaysBetween(new Date(), d);
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 14) return 'in 1 week';
  if (diffDays < 30) return `in ${Math.round(diffDays / 7)} weeks`;
  if (diffDays < 60) return 'in 1 month';
  if (diffDays < 365) return `in ${Math.round(diffDays / 30)} months`;
  const years = Math.round(diffDays / 365);
  return `in ${years} year${years === 1 ? '' : 's'}`;
}

export function formatEventRelativeCompact(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '—';
  const diffDays = torontoCalendarDaysBetween(new Date(), d);
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 14) return '1wk';
  if (diffDays < 30) return `${Math.round(diffDays / 7)}wk`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)}mo`;
  const years = Math.round(diffDays / 365);
  return years === 1 ? '1y' : `${years}y`;
}

export function galleryLinksFromAgreement(agreement: Agreement): GalleryLink[] {
  const gl = agreement.galleryLinks;
  if (Array.isArray(gl) && gl.length > 0) {
    return gl.map((g) => ({
      title: typeof g?.title === 'string' ? g.title : 'Photo Gallery',
      url: typeof g?.url === 'string' ? g.url : '',
    }));
  }
  if (agreement.galleryLink) {
    return [{ title: 'Photo Gallery', url: agreement.galleryLink }];
  }
  return [{ title: '', url: '' }];
}

export function packagePriceOf(agreement: Agreement): number | string | null | undefined {
  return agreement.event?.packagePrice ?? agreement.client.packagePrice;
}
