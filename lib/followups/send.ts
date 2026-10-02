import {
  buildGalleryReadyEmail,
  resolveGalleryLinks,
} from '@/app/api/agreements/send-gallery-ready-email/buildGalleryReadyEmail';
import { logAgreementActivity } from '@/lib/activityLog';
import { adminAgreementUrl } from '@/lib/calendarFeed';
import { sendEmail } from '@/lib/email/send';
import { buildReviewRequestEmail } from '@/lib/followups/reviewRequestEmail';
import { manualReviewRefusal } from '@/lib/followups/rules';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export type FollowupTrigger = 'auto' | 'manual';

export type FollowupSendResult =
  | { status: 'sent'; agreementId: string; to: string; subject: string }
  | { status: 'dry_run'; agreementId: string; to: string; subject: string; html: string }
  | { status: 'refused'; agreementId: string; reason: string }
  | { status: 'failed'; agreementId: string; reason: string };

type SendOptions = { trigger: FollowupTrigger; dryRun: boolean; now?: Date };

function clientName(client: { firstName: string; lastName: string }): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function reportSendFailure(
  agreementId: string,
  name: string,
  email: 'gallery' | 'review',
  trigger: FollowupTrigger,
  error: unknown,
) {
  const reason = errorText(error);
  await logAgreementActivity(agreementId, 'FOLLOWUP_EMAIL_FAILED', { email, trigger, error: reason });
  const label = email === 'gallery' ? 'Gallery email' : 'Review request';
  await sendTelegramMessage(
    `${label} failed for ${name}. Nothing was recorded as sent, so it will be tried again on the next run.\n${reason}\n${adminAgreementUrl(agreementId)}`,
    { disableWebPagePreview: true },
  );
}

const galleryInclude = { client: true, event: true } as const;

/**
 * Send the gallery email. The first send claims galleryEmailSentAt atomically (that starts the
 * review clock) and rolls it back if the email fails. `resend` sends it again without touching
 * the timestamp. A dry run reads only: no claim, no email, no Telegram.
 */
export async function sendGalleryEmail(
  agreementId: string,
  options: SendOptions & { resend?: boolean },
): Promise<FollowupSendResult> {
  const now = options.now ?? new Date();
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId }, include: galleryInclude });
  if (!agreement) return { status: 'refused', agreementId, reason: 'Agreement not found' };
  if (resolveGalleryLinks(agreement).length === 0) {
    return { status: 'refused', agreementId, reason: 'No gallery link has been set for this agreement.' };
  }
  if (options.resend && !agreement.galleryEmailSentAt) {
    return { status: 'refused', agreementId, reason: "The gallery email hasn't been sent yet. Use Send now." };
  }
  if (!options.resend && agreement.galleryEmailSentAt) {
    return { status: 'refused', agreementId, reason: 'The gallery email has already been sent. Use Resend to send it again.' };
  }

  const to = agreement.client.email;
  const { subject, html } = buildGalleryReadyEmail(agreement);
  if (options.dryRun) return { status: 'dry_run', agreementId, to, subject, html };

  const name = clientName(agreement.client);

  if (options.resend) {
    try {
      await sendEmail({ to, subject, html });
    } catch (error) {
      await reportSendFailure(agreementId, name, 'gallery', options.trigger, error);
      return { status: 'failed', agreementId, reason: errorText(error) };
    }
    await logAgreementActivity(agreementId, 'GALLERY_EMAIL_SENT', { trigger: options.trigger, resend: true, recipient: to });
    return { status: 'sent', agreementId, to, subject };
  }

  const claim = await prisma.agreement.updateMany({
    where: { id: agreementId, galleryEmailSentAt: null },
    data: { galleryEmailSentAt: now },
  });
  if (claim.count === 0) {
    return { status: 'refused', agreementId, reason: 'The gallery email has already been sent.' };
  }

  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    await prisma.agreement.updateMany({
      where: { id: agreementId, galleryEmailSentAt: now },
      data: { galleryEmailSentAt: null },
    });
    await reportSendFailure(agreementId, name, 'gallery', options.trigger, error);
    return { status: 'failed', agreementId, reason: errorText(error) };
  }

  await logAgreementActivity(agreementId, 'GALLERY_EMAIL_SENT', { trigger: options.trigger, recipient: to });
  return { status: 'sent', agreementId, to, subject };
}

/**
 * Send the one-time review request. Claims reviewRequestSentAt atomically so only one ever
 * goes out, manual or automatic, and rolls the claim back if the email fails.
 */
export async function sendReviewRequest(
  agreementId: string,
  options: SendOptions & { reviewUrl: string; market?: 'ontario' | 'calgary' },
): Promise<FollowupSendResult> {
  const now = options.now ?? new Date();
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { client: true } });
  if (!agreement) return { status: 'refused', agreementId, reason: 'Agreement not found' };
  const refusal = manualReviewRefusal(agreement);
  if (refusal) return { status: 'refused', agreementId, reason: refusal };
  if (!agreement.client.email) return { status: 'refused', agreementId, reason: 'Client email is missing' };

  const to = agreement.client.email;
  const { subject, html, text } = buildReviewRequestEmail(agreement.client, options.reviewUrl);
  if (options.dryRun) return { status: 'dry_run', agreementId, to, subject, html };

  const claim = await prisma.agreement.updateMany({
    where: { id: agreementId, reviewRequestSentAt: null },
    data: { reviewRequestSentAt: now },
  });
  if (claim.count === 0) {
    return { status: 'refused', agreementId, reason: 'A review request has already been sent for this agreement.' };
  }

  try {
    await sendEmail({ to, subject, html, text });
  } catch (error) {
    await prisma.agreement.updateMany({
      where: { id: agreementId, reviewRequestSentAt: now },
      data: { reviewRequestSentAt: null },
    });
    await reportSendFailure(agreementId, clientName(agreement.client), 'review', options.trigger, error);
    return { status: 'failed', agreementId, reason: errorText(error) };
  }

  await logAgreementActivity(agreementId, 'REVIEW_REQUEST_SENT', {
    trigger: options.trigger,
    recipient: to,
    market: options.market ?? 'ontario',
  });
  return { status: 'sent', agreementId, to, subject };
}

/**
 * Record a held gallery: one Telegram alert and one activity entry per agreement, ever.
 * The claim on galleryHeldAlertAt makes overlapping runs alert only once.
 */
export async function alertHeldGallery(
  agreement: { id: string; client: { firstName: string; lastName: string }; paymentStatus: string | null },
  options: { dryRun: boolean; now?: Date },
): Promise<'alerted' | 'already_alerted' | 'dry_run'> {
  if (options.dryRun) return 'dry_run';
  const claim = await prisma.agreement.updateMany({
    where: { id: agreement.id, galleryHeldAlertAt: null },
    data: { galleryHeldAlertAt: options.now ?? new Date() },
  });
  if (claim.count === 0) return 'already_alerted';

  const paymentStatus = agreement.paymentStatus?.trim() || 'blank';
  await logAgreementActivity(agreement.id, 'GALLERY_EMAIL_HELD', { paymentStatus });
  await sendTelegramMessage(
    `Gallery email held for ${clientName(agreement.client)}: payment status is "${paymentStatus}", not "Fully paid". It goes out on the next 10am run once marked Fully paid, or use Send now.\n${adminAgreementUrl(agreement.id)}`,
    { disableWebPagePreview: true },
  );
  return 'alerted';
}
