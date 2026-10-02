export type { AttendantConflict } from '@/lib/attendants/conflicts';

export type AgreementStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';

export interface AttendantSummary {
  id: string;
  name: string;
  active: boolean;
}

export interface AgreementBackdropLink {
  id: string;
  name: string;
  attendantId?: string | null;
  attendant?: AttendantSummary | null;
}

export interface GalleryLink {
  title: string;
  url: string;
}

export interface AgreementClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventDate?: string | null;
  packagePrice?: number | string | null;
}

export interface AgreementTemplate {
  id: string;
  title: string;
  htmlContent?: string;
  internalTitle?: string | null;
}

export interface AgreementEvent {
  id: string;
  eventDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  eventStartTime?: string | null;
  eventDuration?: string | null;
  eventPackage?: string | null;
  packagePrice?: number | string | null;
}

export interface Agreement {
  id: string;
  uniqueToken: string;
  status: AgreementStatus;
  expiresAt: string;
  createdAt: string;
  signedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  lastEmailedAt?: string | null;
  emailSendCount: number;
  viewCount?: number;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  unreadNotesCount?: number;
  chaserPaused?: boolean;
  selectedBackdropName?: string | null;
  paymentStatus?: string | null;
  balanceDigestSnoozedUntil?: string | null;
  balanceReminderSentAt?: string | null;
  reviewRequestSentAt?: string | null;
  showPhoneNumberAlways?: boolean;
  forceVirtualGreenScreen?: boolean;
  stripePaymentLink?: string | null;
  stripeReceiptLink?: string | null;
  galleryLink?: string | null;
  galleryLinks?: GalleryLink[] | null;
  galleryEmailSentAt?: string | null;
  nextAction?: string | null;
  customHtmlContent?: string | null;
  secondSignerEnabled?: boolean;
  secondSignerFirstName?: string | null;
  secondSignerLastName?: string | null;
  secondSignerEmail?: string | null;
  secondSignerPhone?: string | null;
  requireBothSignatures?: boolean;
  reminderCount?: number;
  lastReminderAt?: string | null;
  client: AgreementClient;
  template: AgreementTemplate;
  event?: AgreementEvent | null;
  backdropLinkId?: string | null;
  backdropLink?: AgreementBackdropLink | null;
}

export interface WarningData {
  warnings: Array<{
    id: string;
    warningType: 'expiration' | 'critical' | 'warning';
    daysSinceSent?: number;
    hoursUntilExpiry?: number;
  }>;
}

export interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TemplateOption {
  id: string;
  title: string;
  internalTitle?: string | null;
}

export interface BackdropLinkOption {
  id: string;
  name: string;
  url?: string;
  attendantId?: string | null;
  attendant?: AttendantSummary | null;
}

export interface BackdropOption {
  id: string;
  name: string;
}

export type InvoiceType = 'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount';

export interface InvoiceResult {
  success?: boolean;
  message?: string;
  customerId?: string;
  invoices?: Array<{
    type?: string;
    amount: number;
    dueDate: string;
    invoiceUrl?: string;
  }>;
}

export const NO_ATTENDANT_FILTER = '__none__';
export const DOUBLE_BOOKED_FILTER = '__double_booked__';
export const ITEMS_PER_PAGE = 25;

export const STATUS_FILTERS = [
  'ALL',
  'DRAFT',
  'SENT',
  'SIGNED',
  'COMPLETED',
  'CANCELLED',
] as const;
