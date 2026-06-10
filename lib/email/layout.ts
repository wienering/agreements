/**
 * Shared HTML email layout — quote PDF palette, table-based, inline styles only.
 */

export type EmailTone = 'default' | 'alert';

export type EmailCta = {
  label: string;
  url: string;
};

export type RenderCtaButtonOptions = EmailCta & {
  tone?: EmailTone;
};

export type RenderEmailLayoutOptions = {
  title: string;
  preheader?: string;
  bodyHtml: string;
  /** Optional bottom CTA for emails that do not embed the button in bodyHtml. */
  cta?: EmailCta;
  tone?: EmailTone;
};

/** Quote PDF tokens (see app/api/quotes/generate-pdf/route.ts) */
const PAPER = '#FAF6EF';
const INK = '#2A2724';
const ACCENT = '#C0552F';
const ALERT = '#B3392B';
const MUTED = '#6E655A';
const HAIRLINE = '#E5DDCF';
const PANEL_FILL = '#F2EBDD';

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function accentForTone(tone: EmailTone): string {
  return tone === 'alert' ? ALERT : ACCENT;
}

function bulletproofButton(label: string, url: string, bg: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;margin:24px 0;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
        <tr>
          <td align="center" bgcolor="${bg}" style="border-radius:4px;background-color:${bg};">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="8%" strokecolor="${bg}" fillcolor="${bg}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT_STACK};font-size:16px;line-height:1.25;color:#ffffff;text-decoration:none;font-weight:600;border-radius:4px;background-color:${bg};">${label}</a>
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
  return bulletproofButton(options.label, options.url, accent);
}

/**
 * Returns a complete HTML email document with quote-brand styling.
 */
export function renderEmailLayout(options: RenderEmailLayoutOptions): string {
  const tone = options.tone ?? 'default';
  const accent = accentForTone(tone);
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
          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding:8px 24px 0 24px;font-family:${FONT_STACK};">
              <p style="margin:0;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${INK};">PHOTOBOOTH GUYS</p>
            </td>
          </tr>
          <!-- Accent rule -->
          <tr>
            <td style="padding:12px 24px 0 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="2" style="height:2px;line-height:2px;font-size:2px;background-color:${accent};">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding:20px 24px 0 24px;font-family:${FONT_STACK};">
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:600;color:${INK};">${options.title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:20px 24px 0 24px;font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:${INK};">
              ${options.bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          ${
            ctaBlock
              ? `<tr>
            <td style="padding:0 24px;font-family:${FONT_STACK};">
              ${ctaBlock}
            </td>
          </tr>`
              : ''
          }
          <!-- Footer -->
          <tr>
            <td style="padding:32px 24px 8px 24px;font-family:${FONT_STACK};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${HAIRLINE};">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 24px 24px 24px;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${MUTED};">
              <p style="margin:0 0 4px 0;"><a href="https://photoboothguys.ca" style="color:${MUTED};text-decoration:underline;">photoboothguys.ca</a></p>
              <p style="margin:0;">647-378-5332</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Inline notice block styled to match the layout palette (for use inside bodyHtml). */
export function renderNoticeBlock(
  label: string,
  contentHtml: string,
  tone: EmailTone = 'default',
): string {
  const accent = accentForTone(tone);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td style="padding:16px 18px;background-color:${PANEL_FILL};border:1px solid ${HAIRLINE};border-left:3px solid ${accent};font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${INK};">
      <p style="margin:0 0 8px 0;font-weight:600;color:${INK};">${label}</p>
      <p style="margin:0;">${contentHtml}</p>
    </td>
  </tr>
</table>`;
}
