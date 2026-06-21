import type { Agreement, Client, Event } from '@prisma/client';
import { escapeHtml } from '@/lib/htmlEscape';
import {
  renderCtaButton,
  renderEmailLayout,
  renderNoticeBlock,
} from '@/lib/email/layout';
import { getEmailGreeting } from '@/lib/email/greeting';

export type GalleryLink = { title: string; url: string };

export type GalleryReadyAgreement = Pick<Agreement, 'galleryLink' | 'galleryLinks'> & {
  client: Pick<Client, 'firstName' | 'emailGreetingName'>;
  event: Pick<Event, 'eventDate' | 'eventType'> | null;
};

export function resolveGalleryLinks(agreement: GalleryReadyAgreement): GalleryLink[] {
  const galleryLinksRaw = agreement.galleryLinks as Array<{ title: string; url: string }> | null;
  if (Array.isArray(galleryLinksRaw) && galleryLinksRaw.length > 0) {
    return galleryLinksRaw.filter((g) => g?.url?.trim());
  }
  if (agreement.galleryLink) {
    return [{ title: 'Photo Gallery', url: agreement.galleryLink }];
  }
  return [];
}

export function buildGalleryReadyEmail(agreement: GalleryReadyAgreement): { subject: string; html: string } {
  const galleryLinks = resolveGalleryLinks(agreement);
  if (galleryLinks.length === 0) {
    throw new Error('NO_GALLERY_LINKS');
  }

  const eventDate = agreement.event?.eventDate
    ? new Date(agreement.event.eventDate).toLocaleDateString('en-CA', {
        timeZone: 'America/Toronto',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const eventType = escapeHtml(agreement.event?.eventType || 'event');
  const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));
  const eventDateSafe = eventDate ? escapeHtml(eventDate) : null;
  const galleryLinksHtml = galleryLinks
    .map((g, i) => {
      const title = escapeHtml((g.title || 'Photo Gallery').trim() || `Gallery ${i + 1}`);
      const url = escapeHtml(g.url);
      return `<li style="margin-bottom:8px;"><strong>${title}:</strong> <a href="${url}" style="color:#C0552F;text-decoration:underline;">${url}</a></li>`;
    })
    .join('');
  const galleryIntro =
    galleryLinks.length === 1
      ? `Here is the link for your ${escapeHtml((galleryLinks[0].title || 'photo gallery').trim())}:`
      : 'Here are the links for your galleries:';

  const preheader = `Your photo gallery is now ready. View and download your event photos whenever you like.`;

  const galleryLinksPanel = `
      ${galleryIntro}<br>
      <ul style="margin:8px 0 0 0;padding-left:20px;">${galleryLinksHtml}</ul>
      ${eventDateSafe ? `<p style="margin:12px 0 0 0;">Event Date: ${eventDateSafe}</p>` : ''}`;

  const reviewPanel = `
      <p style="margin:0 0 16px 0;">We loved being part of your event. If you have a moment, a Google review would mean a lot to us. It helps other people find us and makes a real difference for a small business like ours.</p>
      <p style="margin:0;"><a href="https://g.page/r/CXHuVoPHi-cIEAI/review" style="color:#C0552F;text-decoration:underline;">Leave a Google Review</a></p>`;

  const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hi ${clientGreeting},</p>
      <p style="margin:0 0 16px 0;">Thank you for choosing Photobooth Guys for your ${eventType}. We hope you had a wonderful time. Your photo gallery is now ready, and you can view and download all of your event photos whenever you like.</p>
      ${renderCtaButton({ label: 'View Your Gallery', url: galleryLinks[0].url, tone: 'default' })}
      ${renderNoticeBlock('Leave Us a Review', reviewPanel, 'default')}
      ${renderNoticeBlock('Your Gallery Links', galleryLinksPanel, 'default')}
      <p style="margin:16px 0 0 0;">We truly appreciate you choosing Photobooth Guys to be part of your special day. It was a pleasure serving you, and we hope the photos bring back wonderful memories!</p>
      ${renderNoticeBlock(
        'Questions or Need Help?',
        `
        Our team is here to help!<br>
        <strong>Email:</strong> info@photoboothguys.ca<br>
        <strong>Phone:</strong> 647-378-5332<br>
        <strong>Website:</strong> <a href="https://photoboothguys.ca" style="color:#C0552F;text-decoration:underline;">photoboothguys.ca</a>
      `,
        'default',
      )}
      <p style="margin:16px 0 0 0;">Thank you again for choosing us. We look forward to capturing more memories for you in the future!</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>The Photobooth Guys Team</strong></p>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6E655A;text-align:center;">
        Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
      </p>
    `;

  const html = renderEmailLayout({
    title: 'Your Photo Gallery is Ready',
    preheader,
    bodyHtml,
    tone: 'default',
  });

  return {
    subject: `Your Photo Gallery is Ready - ${clientGreeting}!`,
    html,
  };
}
