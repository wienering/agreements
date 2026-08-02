/**
 * Shared HTML email layout — quote PDF palette, table-based, inline styles only.
 */

import { escapeHtml } from '@/lib/htmlEscape';

export type EmailTone = 'default' | 'alert';

export type EmailCta = {
  label: string;
  url: string;
};

export type RenderCtaButtonOptions = EmailCta & {
  tone?: EmailTone;
  variant?: 'filled' | 'outlined';
};

export type RenderEmailLayoutOptions = {
  title: string;
  preheader?: string;
  bodyHtml: string;
  /** Optional bottom CTA for emails that do not embed the button in bodyHtml. */
  cta?: EmailCta;
  tone?: EmailTone;
};

/** Mirrors the tokens in app/globals.css and the quote PDF. */
const PAPER = '#FBFBF9';
const INK = '#1A1A18';
const ACCENT = '#1E3B31';
const ACCENT_ON = '#FBFBF9';
const ALERT = '#9E2B2B';
const MUTED = '#5E5E58';
const HAIRLINE = '#E3E3DE';
const RULE_STRONG = '#1A1A18';
const PANEL_FILL = '#F2F2EF';

/**
 * Webfonts do not load in Outlook, so structure and spacing carry the identity
 * rather than the face. Helvetica then Arial are the honest fallbacks.
 */
const FONT_STACK = "'Libre Franklin', Helvetica, Arial, sans-serif";

const CONTACT_PHONE = '647-378-5332';
const CONTACT_EMAIL = 'info@photoboothguys.ca';
const CONTACT_SITE = 'photoboothguys.ca';

/** Horizontal padding inside the 600px container. */
const GUTTER = 32;

/** Usable body width: 600px container − 32px padding each side. */
export const EMAIL_CONTENT_WIDTH = 600 - GUTTER * 2;
const PAIR_GUTTER = 12;
const PAIR_BUTTON_WIDTH = (EMAIL_CONTENT_WIDTH - PAIR_GUTTER) / 2; // 270

function accentForTone(tone: EmailTone): string {
  return tone === 'alert' ? ALERT : ACCENT;
}

type BulletproofButtonOptions = {
  margin?: string;
  /** MSO VML width in px. Defaults to 300 (unchanged from pre-change single buttons). */
  widthPx?: number;
  /**
   * When true, the button fills its container at equal width (for side-by-side pairs).
   * Single buttons keep shrink-to-fit.
   */
  fillWidth?: boolean;
};

function bulletproofButton(
  label: string,
  url: string,
  accent: string,
  variant: 'filled' | 'outlined' = 'filled',
  options?: BulletproofButtonOptions,
): string {
  const isOutlined = variant === 'outlined';
  const bg = isOutlined ? PAPER : accent;
  const textColor = isOutlined ? accent : ACCENT_ON;
  // Border on the td only — filled has none, so dimensions/edge stay unchanged.
  const tdBorder = isOutlined ? `border:1px solid ${accent};` : '';
  const margin = options?.margin ?? '24px 0';
  // 300 matches the pre-change MSO width for single buttons.
  const msoWidth = options?.widthPx ?? 300;
  const fillWidth = options?.fillWidth === true;
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  const innerTableWidthAttrs = fillWidth
    ? `width="100%" style="width:100%;"`
    : `align="center"`;
  const tdExtra = fillWidth
    ? 'width:100%;box-sizing:border-box;'
    : '';
  const anchorDisplay = fillWidth
    ? 'display:block;width:100%;text-align:center;box-sizing:border-box;'
    : 'display:inline-block;';

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;margin:${margin};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" ${innerTableWidthAttrs}>
        <tr>
          <td align="center" bgcolor="${bg}" style="border-radius:2px;background-color:${bg};${tdBorder}${tdExtra}">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:${msoWidth}px;" arcsize="4%" strokecolor="${accent}" fillcolor="${bg}">
              <w:anchorlock/>
              <center style="color:${textColor};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${safeLabel}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${safeUrl}" target="_blank" style="${anchorDisplay}padding:14px 30px;font-family:${FONT_STACK};font-size:15px;line-height:1.25;color:${textColor};text-decoration:none;font-weight:600;border-radius:2px;background-color:${bg};">${safeLabel}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Self-contained bulletproof CTA for placement anywhere inside bodyHtml. */
export function renderCtaButton(options: RenderCtaButtonOptions): string {
  const accent = accentForTone(options.tone ?? 'default');
  return bulletproofButton(
    options.label,
    options.url,
    accent,
    options.variant ?? 'filled',
  );
}

/** Two filled CTAs side-by-side at equal width; stacks when the viewport is narrower than the content area. */
export function renderCtaButtonPair(
  left: RenderCtaButtonOptions,
  right: RenderCtaButtonOptions,
): string {
  const leftBtn = bulletproofButton(
    left.label,
    left.url,
    accentForTone(left.tone ?? 'default'),
    left.variant ?? 'filled',
    { margin: '0', widthPx: PAIR_BUTTON_WIDTH, fillWidth: true },
  );
  const rightBtn = bulletproofButton(
    right.label,
    right.url,
    accentForTone(right.tone ?? 'default'),
    right.variant ?? 'filled',
    { margin: '0', widthPx: PAIR_BUTTON_WIDTH, fillWidth: true },
  );

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;margin:24px 0;">
  <tr>
    <td align="center" style="padding:0;font-size:0;line-height:0;">
      <!--[if mso]>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${EMAIL_CONTENT_WIDTH}"><tr>
      <td valign="top" width="${PAIR_BUTTON_WIDTH}" style="width:${PAIR_BUTTON_WIDTH}px;padding:0;">
      <![endif]-->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" width="${PAIR_BUTTON_WIDTH}" style="width:100%;max-width:${PAIR_BUTTON_WIDTH}px;display:inline-block;vertical-align:top;">
        <tr>
          <td style="padding:0;font-size:15px;line-height:1.65;">${leftBtn}</td>
        </tr>
      </table>
      <!--[if mso]>
      </td>
      <td width="${PAIR_GUTTER}" style="width:${PAIR_GUTTER}px;font-size:0;line-height:0;">&nbsp;</td>
      <td valign="top" width="${PAIR_BUTTON_WIDTH}" style="width:${PAIR_BUTTON_WIDTH}px;padding:0;">
      <![endif]-->
      <!--[if !mso]><!-->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" width="${PAIR_GUTTER}" style="width:${PAIR_GUTTER}px;display:inline-block;">
        <tr><td style="font-size:0;line-height:0;padding:0;">&nbsp;</td></tr>
      </table>
      <!--<![endif]-->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" width="${PAIR_BUTTON_WIDTH}" style="width:100%;max-width:${PAIR_BUTTON_WIDTH}px;display:inline-block;vertical-align:top;">
        <tr>
          <td style="padding:0;font-size:15px;line-height:1.65;">${rightBtn}</td>
        </tr>
      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </td>
  </tr>
</table>`;
}

/**
 * Returns a complete HTML email document with quote-brand styling.
 */
export function renderEmailLayout(options: RenderEmailLayoutOptions): string {
  const tone = options.tone ?? 'default';
  const preheader = options.preheader ?? '';
  const ctaBlock = options.cta
    ? renderCtaButton({ ...options.cta, tone })
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${options.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:${PAPER};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${
    preheader
      ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>`
      : ''
  }
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${PAPER};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${PAPER};">
          <!-- Letterhead: the mark, the details, and one hairline. No colored
               band, no filled bar, no reversed block. Swap the wordmark cell
               for <img src="…/logo-lockup@2x.png" width="160"> once that file
               lands — see the file table in DESIGN.md. -->
          <tr>
            <td style="padding:8px ${GUTTER}px 0 ${GUTTER}px;font-family:${FONT_STACK};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="top" style="font-family:${FONT_STACK};">
                    <p style="margin:0;font-size:17px;line-height:1.3;font-weight:600;color:${INK};">Photobooth Guys</p>
                    <p style="margin:4px 0 0 0;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">Greater Toronto Area</p>
                  </td>
                  <td valign="top" align="right" style="font-family:${FONT_STACK};font-size:11px;line-height:1.85;color:${MUTED};">
                    ${CONTACT_PHONE}<br>${CONTACT_EMAIL}<br>${CONTACT_SITE}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hairline beneath the letterhead -->
          <tr>
            <td style="padding:18px ${GUTTER}px 0 ${GUTTER}px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${HAIRLINE};">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title, then the one heavy rule -->
          <tr>
            <td style="padding:26px ${GUTTER}px 0 ${GUTTER}px;font-family:${FONT_STACK};">
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.01em;color:${INK};">${options.title}</h1>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${RULE_STRONG};">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px ${GUTTER}px 0 ${GUTTER}px;font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:${INK};">
              ${options.bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          ${
            ctaBlock
              ? `<tr>
            <td style="padding:0 ${GUTTER}px;font-family:${FONT_STACK};">
              ${ctaBlock}
            </td>
          </tr>`
              : ''
          }
          <!-- Footer -->
          <tr>
            <td style="padding:32px ${GUTTER}px 8px ${GUTTER}px;font-family:${FONT_STACK};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${HAIRLINE};">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px ${GUTTER}px 30px ${GUTTER}px;font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${MUTED};">
              Photobooth Guys<br>Serving the Greater Toronto Area<br>
              <a href="https://${CONTACT_SITE}" style="color:${ACCENT};text-decoration:none;">${CONTACT_SITE}</a> &nbsp;·&nbsp; ${CONTACT_PHONE}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Inline notice block (for use inside bodyHtml). The label carries the meaning
 * and the tone tints the label only, so the notice never depends on colour
 * alone to be read.
 */
export function renderNoticeBlock(
  label: string,
  contentHtml: string,
  tone: EmailTone = 'default',
): string {
  const labelColor = tone === 'alert' ? ALERT : INK;
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td style="padding:16px 18px;background-color:${PANEL_FILL};font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${INK};">
      <p style="margin:0 0 8px 0;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${labelColor};">${label}</p>
      <p style="margin:0;">${contentHtml}</p>
    </td>
  </tr>
</table>`;
}

/** Content panel without a label (agreement body, note text, etc.). */
export function renderContentPanel(contentHtml: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
  <tr>
    <td style="padding:16px 18px;background-color:${PANEL_FILL};font-family:${FONT_STACK};font-size:14px;line-height:1.65;color:${INK};word-break:break-word;">
      ${contentHtml}
    </td>
  </tr>
</table>`;
}

/** Centered OTP / verification code panel. */
export function renderCodePanel(code: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center" style="padding:24px 18px;background-color:${PANEL_FILL};font-family:${FONT_STACK};">
      <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">Your verification code</p>
      <p style="margin:12px 0 0 0;font-size:34px;font-weight:600;letter-spacing:0.18em;color:${INK};font-family:${FONT_STACK};">${code}</p>
      <p style="margin:12px 0 0 0;font-size:13px;color:${MUTED};">Expires in 15 minutes</p>
    </td>
  </tr>
</table>`;
}
