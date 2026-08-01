import type { Agreement, Client, Event } from '@prisma/client';
import { escapeHtml } from '@/lib/htmlEscape';
import {
  renderCtaButton,
  renderCtaButtonPair,
  renderEmailLayout,
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

const LABEL_MAX = 28;

function truncateLabel(title: string, max = LABEL_MAX): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1).trimEnd()}…`;
}

/** Per-gallery friendly label for 3–4 / 5+ cases. */
function friendlyGalleryLabel(title: string): string {
  const t = (title || '').trim();
  if (/360/i.test(t)) return '360 gallery';
  if (!t || /photo\s*(booth|gallery)/i.test(t)) return 'Photo booth gallery';
  return truncateLabel(t);
}

/**
 * Exactly one /360/i match → that one is "360 gallery", the other is
 * "Photo booth gallery". Both or neither → raw (truncated) titles.
 */
function labelsForTwoGalleries(links: [GalleryLink, GalleryLink]): [string, string] {
  const a360 = /360/i.test(links[0].title || '');
  const b360 = /360/i.test(links[1].title || '');
  if (a360 !== b360) {
    return [
      a360 ? '360 gallery' : 'Photo booth gallery',
      b360 ? '360 gallery' : 'Photo booth gallery',
    ];
  }
  return [
    truncateLabel((links[0].title || 'Photo Gallery').trim() || 'Photo Gallery'),
    truncateLabel((links[1].title || 'Photo Gallery').trim() || 'Photo Gallery'),
  ];
}

function renderGalleryCtas(galleryLinks: GalleryLink[]): string {
  if (galleryLinks.length === 1) {
    return renderCtaButton({ label: 'View Your Gallery', url: galleryLinks[0].url });
  }
  if (galleryLinks.length === 2) {
    const [leftLabel, rightLabel] = labelsForTwoGalleries([
      galleryLinks[0],
      galleryLinks[1],
    ]);
    return renderCtaButtonPair(
      { label: leftLabel, url: galleryLinks[0].url },
      { label: rightLabel, url: galleryLinks[1].url },
    );
  }
  if (galleryLinks.length <= 4) {
    return galleryLinks
      .map((g) =>
        renderCtaButton({
          label: friendlyGalleryLabel(g.title),
          url: g.url,
        }),
      )
      .join('');
  }
  const items = galleryLinks
    .map((g) => {
      const title = escapeHtml(friendlyGalleryLabel(g.title));
      const href = escapeHtml(g.url);
      return `<li style="margin-bottom:8px;"><a href="${href}" style="color:#C0552F;text-decoration:underline;">${title}</a></li>`;
    })
    .join('');
  return `<ul style="margin:16px 0;padding-left:20px;">${items}</ul>`;
}

export function buildGalleryReadyEmail(agreement: GalleryReadyAgreement): { subject: string; html: string } {
  const galleryLinks = resolveGalleryLinks(agreement);
  if (galleryLinks.length === 0) {
    throw new Error('NO_GALLERY_LINKS');
  }

  const eventDateFull = agreement.event?.eventDate
    ? new Date(agreement.event.eventDate).toLocaleDateString('en-CA', {
        timeZone: 'America/Toronto',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const eventDateShort = agreement.event?.eventDate
    ? new Date(agreement.event.eventDate).toLocaleDateString('en-CA', {
        timeZone: 'America/Toronto',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const eventType = escapeHtml(agreement.event?.eventType || 'event');
  const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));

  const preheader =
    'Your photo gallery is now ready. View and download your event photos whenever you like.';

  const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hi ${clientGreeting},</p>
      <p style="margin:0 0 16px 0;">Your photos from your ${eventType} are ready. You can view and download them whenever you like.</p>
      ${renderGalleryCtas(galleryLinks)}
      ${
        eventDateFull
          ? `<p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#6E655A;">${escapeHtml(eventDateFull)}</p>`
          : ''
      }
      <p style="margin:24px 0 8px 0;font-weight:600;">Enjoyed the booth?</p>
      <p style="margin:0 0 16px 0;">Google reviews are how most people find us, and a few words from you does more than anything we could say about ourselves. If your attendant looked after you, mentioning them by name is a nice touch.</p>
      ${renderCtaButton({
        label: 'Leave a Google Review',
        url: 'https://g.page/r/CXHuVoPHi-cIEAI/review',
        variant: 'outlined',
      })}
      <p style="margin:24px 0 8px 0;font-weight:600;">Know someone with an event coming up?</p>
      <p style="margin:0 0 16px 0;">Send them our way, or forward them this gallery so they can see what the photos look like. We also do event and corporate photography if you ever need coverage beyond the booth.</p>
      <p style="margin:16px 0 0 0;">Any questions about your gallery, just reply to this email or give me a call at 647-378-5332.</p>
      <p style="margin:16px 0 0 0;">Thank you for choosing Photobooth Guys.</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>Dennis</strong><br>Photobooth Guys</p>
    `;

  const html = renderEmailLayout({
    title: 'Your Photo Gallery is Ready',
    preheader,
    bodyHtml,
    tone: 'default',
  });

  return {
    subject: eventDateShort
      ? `Your photos from ${eventDateShort}`
      : 'Your photos are ready',
    html,
  };
}
