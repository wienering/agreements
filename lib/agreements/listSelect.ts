import type { Prisma } from '@prisma/client';

type BooleanSelect<T> = { [K in keyof T]-?: true };

type TemplateScalarSelect = Omit<Prisma.TemplateSelect, 'agreements' | 'fields' | '_count'>;

/** Template fields for the list, without the stored HTML body. */
export const templateListSlimSelect = {
  id: true,
  title: true,
  version: true,
  fieldsSchema: true,
  createdAt: true,
  updatedAt: true,
  internalTitle: true,
  order: true,
} satisfies BooleanSelect<Omit<TemplateScalarSelect, 'htmlContent'>>;

type AgreementRelationKeys =
  | 'client'
  | 'template'
  | 'event'
  | 'lead'
  | 'backdropLink'
  | 'fields'
  | 'signatures'
  | 'auditLogs'
  | 'notes'
  | 'activities'
  | '_count';

const agreementListSlimScalars = {
  id: true,
  clientId: true,
  templateId: true,
  eventId: true,
  status: true,
  uniqueToken: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  signedAt: true,
  signedFromIP: true,
  cancelledAt: true,
  cancelledBy: true,
  cancellationReason: true,
  archived: true,
  archivedAt: true,
  lastEmailedAt: true,
  emailSendCount: true,
  firstViewedAt: true,
  lastViewedAt: true,
  notesLastViewedAt: true,
  viewCount: true,
  paymentStatus: true,
  stripePaymentLink: true,
  stripeReceiptLink: true,
  galleryLink: true,
  galleryLinks: true,
  galleryEmailSentAt: true,
  reviewRequestSentAt: true,
  nextAction: true,
  backdropLinkId: true,
  selectedBackdropName: true,
  showPhoneNumberAlways: true,
  forceVirtualGreenScreen: true,
  secondSignerEnabled: true,
  secondSignerFirstName: true,
  secondSignerLastName: true,
  secondSignerEmail: true,
  secondSignerPhone: true,
  requireBothSignatures: true,
  leadId: true,
  chaserPaused: true,
  reminderCount: true,
  lastReminderAt: true,
  balanceDigestSnoozedUntil: true,
  balanceReminderSentAt: true,
  followUpsPaused: true,
  reviewReceived: true,
  galleryHeldAlertAt: true,
} satisfies BooleanSelect<
  Omit<Prisma.AgreementSelect, AgreementRelationKeys | 'mergedHtml' | 'customHtmlContent'>
>;

/** List payload with mergedHtml, customHtmlContent, and template.htmlContent left out. */
export const agreementListSlimSelect = {
  ...agreementListSlimScalars,
  client: true,
  event: true,
  template: {
    select: templateListSlimSelect,
  },
  backdropLink: {
    select: {
      id: true,
      name: true,
      attendantId: true,
      attendant: { select: { id: true, name: true, active: true } },
    },
  },
} satisfies Prisma.AgreementSelect;
