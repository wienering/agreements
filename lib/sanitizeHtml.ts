import DOMPurify, { type Config } from 'isomorphic-dompurify';

/** Tags permitted in agreement template HTML (formatting + structure). */
const ALLOWED_TAGS = [
  'p',
  'div',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'ol',
  'ul',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'br',
  'hr',
  'img',
  'a',
  'blockquote',
] as const;

/** Attributes permitted on allowed tags. Inline `style` is required for templates. */
const ALLOWED_ATTR = [
  'style',
  'class',
  'id',
  'src',
  'href',
  'alt',
  'width',
  'height',
  'colspan',
  'rowspan',
  'target',
] as const;

/** Explicit blocklist layered on top of the tag whitelist. */
const FORBID_TAGS = ['script'] as const;

/** Event-handler and other dangerous attributes (defense in depth with ALLOWED_ATTR). */
const FORBID_ATTR = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onmouseenter',
  'onmouseleave',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onsubmit',
  'onreset',
  'onload',
  'onunload',
  'onerror',
  'onabort',
  'onscroll',
  'onresize',
  'onwheel',
  'oncopy',
  'oncut',
  'onpaste',
  'oncontextmenu',
  'onpointerdown',
  'onpointerup',
  'onpointermove',
  'onpointerenter',
  'onpointerleave',
  'onpointerover',
  'onpointerout',
  'onpointercancel',
  'onpointerrawupdate',
  'ontouchstart',
  'ontouchend',
  'ontouchmove',
  'ontouchcancel',
  'onanimationstart',
  'onanimationend',
  'onanimationiteration',
  'ontransitionstart',
  'ontransitionend',
  'ontransitionrun',
  'ontransitioncancel',
  'formaction',
  'xlink:href',
] as const;

/**
 * Reject `javascript:` and other dangerous URI schemes in href/src.
 * DOMPurify also strips these by default; this regexp tightens allowed values.
 */
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const AGREEMENT_HTML_CONFIG: Config = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: [...ALLOWED_ATTR],
  FORBID_TAGS: [...FORBID_TAGS],
  FORBID_ATTR: [...FORBID_ATTR],
  ALLOWED_URI_REGEXP,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

/**
 * Sanitize admin-authored agreement HTML at render time.
 * Does not mutate stored template / mergedHtml / customHtmlContent values.
 */
export function sanitizeAgreementHtml(html: string): string {
  if (!html) return html;
  return DOMPurify.sanitize(html, AGREEMENT_HTML_CONFIG);
}
