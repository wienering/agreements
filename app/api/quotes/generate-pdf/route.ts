import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

type NormalizedPackage =
  | { kind: 'standard'; hours: number; price: number }
  | { kind: 'custom'; title: string; description: string; price: number };

type QuoteAddons = {
  unlimitedPrints?: boolean;
  glamBooth?: boolean;
  waitingTime?: boolean;
  waitingHours?: number;
};

type QuoteDiscount = {
  note?: string;
  amount: number;
} | null;

type QuoteOption = {
  package: NormalizedPackage;
  addons: QuoteAddons;
  discount: QuoteDiscount;
  subtotal: number;
  total: number;
};

type ContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
};

type QuotePayload = {
  contactInfo: ContactInfo;
  options: QuoteOption[];
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const BOTTOM_MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT_X = PAGE_WIDTH - MARGIN;

const TOP_BAR_HEIGHT = 4.5;
const CONTENT_START_Y = 16;
const FOOTER_TOP_SPACING = 14;
const OPTION_GAP = 10;
const LINE_ROW_HEIGHT = 7;
const LINE_GAP = 1.5;
const TOTAL_ROW_HEIGHT = 9;
const PANEL_RADIUS = 3;

const PAPER: [number, number, number] = [250, 246, 239];
const INK: [number, number, number] = [42, 39, 36];
const ACCENT: [number, number, number] = [192, 85, 47];
const MUTED: [number, number, number] = [110, 101, 90];
const FAINT: [number, number, number] = [154, 143, 128];
const HAIRLINE: [number, number, number] = [229, 221, 207];
const ROW_DIVIDER: [number, number, number] = [237, 230, 217];
const PANEL_FILL: [number, number, number] = [242, 235, 221];

const TERMS = [
  'A $100 retainer fee is required to secure your booking.',
  'Balance due 7 days before event.',
  'Quote valid for 30 days from date of issue.',
  'Attendant will arrive 1 hour before the start time for set up.',
];

type PdfContext = {
  doc: jsPDF;
};

function normalizePackage(raw: unknown): NormalizedPackage | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price));
  if (Number.isNaN(price)) return null;

  if (p.kind === 'custom') {
    const title = typeof p.title === 'string' ? p.title.trim() : '';
    if (!title) return null;
    const description = typeof p.description === 'string' ? p.description : '';
    return { kind: 'custom', title, description: description.trim(), price };
  }

  const hours = typeof p.hours === 'number' ? p.hours : parseInt(String(p.hours), 10);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return { kind: 'standard', hours, price };
}

function normalizeDiscount(raw: unknown): QuoteDiscount {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const amount = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const note = typeof d.note === 'string' ? d.note : undefined;
  return { note, amount };
}

function normalizeAddons(raw: unknown): QuoteAddons {
  if (!raw || typeof raw !== 'object') return {};
  const a = raw as Record<string, unknown>;
  return {
    unlimitedPrints: Boolean(a.unlimitedPrints),
    glamBooth: Boolean(a.glamBooth),
    waitingTime: Boolean(a.waitingTime),
    waitingHours: typeof a.waitingHours === 'number' ? a.waitingHours : parseInt(String(a.waitingHours || 0), 10),
  };
}

function normalizeQuoteOption(raw: unknown): QuoteOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const packageInfo = normalizePackage(o.package);
  if (!packageInfo) return null;

  const total = typeof o.total === 'number' ? o.total : parseFloat(String(o.total));
  if (!Number.isFinite(total)) return null;

  const subtotal = typeof o.subtotal === 'number' ? o.subtotal : parseFloat(String(o.subtotal ?? total));
  if (!Number.isFinite(subtotal)) return null;

  return {
    package: packageInfo,
    addons: normalizeAddons(o.addons),
    discount: normalizeDiscount(o.discount),
    subtotal,
    total,
  };
}

function normalizeQuotePayload(raw: unknown): QuotePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (!data.contactInfo || typeof data.contactInfo !== 'object') return null;

  let options: QuoteOption[] = [];

  if (Array.isArray(data.options)) {
    for (const item of data.options) {
      const option = normalizeQuoteOption(item);
      if (!option) return null;
      options.push(option);
    }
  } else {
    const legacyOption = normalizeQuoteOption({
      package: data.package,
      addons: data.addons,
      discount: data.discount,
      subtotal: data.subtotal,
      total: data.total,
    });
    if (!legacyOption) return null;
    options = [legacyOption];
  }

  if (options.length === 0) return null;

  return {
    contactInfo: data.contactInfo as ContactInfo,
    options,
  };
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function titleCaseName(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function fillPageBackground(doc: jsPDF): void {
  doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
}

function drawTopAccentBar(doc: jsPDF): void {
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 0, PAGE_WIDTH, TOP_BAR_HEIGHT, 'F');
}

function drawHairline(doc: jsPDF, y: number): void {
  doc.setDrawColor(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, RIGHT_X, y);
}

function drawRowDivider(doc: jsPDF, y: number): void {
  doc.setDrawColor(ROW_DIVIDER[0], ROW_DIVIDER[1], ROW_DIVIDER[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, RIGHT_X, y);
}

function drawRoundedFillRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: [number, number, number]
): void {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x + r, y, w - 2 * r, h, 'F');
  doc.rect(x, y + r, w, h - 2 * r, 'F');
  doc.circle(x + r, y + r, r, 'F');
  doc.circle(x + w - r, y + r, r, 'F');
  doc.circle(x + r, y + h - r, r, 'F');
  doc.circle(x + w - r, y + h - r, r, 'F');
}

function drawSpacedLabel(doc: jsPDF, text: string, x: number, y: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
  doc.text(text.toUpperCase(), x, y, { charSpace: 0.8 });
}

function setupContinuationPage(doc: jsPDF): number {
  fillPageBackground(doc);
  drawTopAccentBar(doc);
  return CONTENT_START_Y;
}

function countLineItems(option: QuoteOption): number {
  let count = 1;
  const { package: packageInfo, addons } = option;
  if (addons.unlimitedPrints && packageInfo.kind === 'standard') count += 1;
  if (addons.glamBooth) count += 1;
  if (addons.waitingTime && (addons.waitingHours ?? 0) > 0) count += 1;
  return count;
}

function estimateOptionBlockHeight(option: QuoteOption, showOptionLabel: boolean): number {
  let height = showOptionLabel ? 7 : 0;
  height += countLineItems(option) * (LINE_ROW_HEIGHT + LINE_GAP);

  const { package: packageInfo } = option;
  if (packageInfo.kind === 'custom' && packageInfo.description?.trim()) {
    height += Math.ceil(packageInfo.description.trim().length / 52) * 3.5;
  }

  if (option.discount && option.discount.amount > 0) {
    height += LINE_ROW_HEIGHT * 2 + 4;
  }

  height += TOTAL_ROW_HEIGHT + 6;
  return height;
}

function estimateFooterHeight(): number {
  const thankYouPanel = 16;
  const termsBlock = 8 + TERMS.length * 4.5 + 6;
  const bottomFooter = 10;
  return thankYouPanel + 10 + termsBlock + bottomFooter;
}

function ensureVerticalSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight <= PAGE_HEIGHT - BOTTOM_MARGIN) {
    return y;
  }
  doc.addPage();
  return setupContinuationPage(doc);
}

function drawSharedHeader(ctx: PdfContext, contactInfo: ContactInfo): number {
  const { doc } = ctx;

  fillPageBackground(doc);
  drawTopAccentBar(doc);

  let y = CONTENT_START_Y;

  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('Photobooth Guys', MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('PROFESSIONAL PHOTO BOOTH RENTAL · TORONTO', MARGIN, y + 6, { charSpace: 0.6 });

  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('647-378-5332', RIGHT_X, y, { align: 'right' });
  doc.text('info@photoboothguys.ca', RIGHT_X, y + 4.5, { align: 'right' });
  doc.text('www.photoboothguys.ca', RIGHT_X, y + 9, { align: 'right' });

  y += 16;
  drawHairline(doc, y);
  y += 10;

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text('Quote', MARGIN, y);

  const quoteDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
  doc.text('DATE', RIGHT_X, y - 8, { align: 'right', charSpace: 0.7 });
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(quoteDate, RIGHT_X, y - 3, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Valid 30 days', RIGHT_X, y + 2, { align: 'right' });

  y += 12;
  drawSpacedLabel(doc, 'Prepared for', MARGIN, y);

  const clientName = contactInfo.name || '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(titleCaseName(clientName), MARGIN, y + 6);

  if (contactInfo.eventDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(contactInfo.eventDate, MARGIN, y + 12);
    y += 12;
  } else {
    y += 6;
  }

  return y + 10;
}

type LineItem = {
  description: string;
  descriptionLines?: string[];
  price: number;
};

function buildLineItems(option: QuoteOption): LineItem[] {
  const { package: packageInfo, addons } = option;
  const items: LineItem[] = [];

  if (packageInfo.kind === 'standard') {
    items.push({
      description: `${packageInfo.hours} Hour Photo Booth Package`,
      price: packageInfo.price,
    });
  } else {
    const lines = [packageInfo.title];
    if (packageInfo.description?.trim()) {
      lines.push(...packageInfo.description.trim().split('\n').filter(Boolean));
    }
    items.push({
      description: packageInfo.title,
      descriptionLines: lines,
      price: packageInfo.price,
    });
  }

  if (addons.unlimitedPrints && packageInfo.kind === 'standard') {
    const isShortPackage = packageInfo.hours <= 3;
    const ratePerHour = isShortPackage ? 60 : 50;
    items.push({
      description: 'Unlimited Prints',
      price: ratePerHour * packageInfo.hours,
    });
  }

  if (addons.glamBooth) {
    items.push({ description: 'Glam Booth', price: 75 });
  }

  if (addons.waitingTime && (addons.waitingHours ?? 0) > 0) {
    const waitingHours = addons.waitingHours ?? 0;
    const description =
      waitingHours > 1 ? `Waiting Time x ${waitingHours}` : 'Waiting Time';
    items.push({
      description,
      price: 50 * waitingHours,
    });
  }

  return items;
}

function drawLineItemRow(ctx: PdfContext, startY: number, item: LineItem): number {
  const { doc } = ctx;
  const descMaxWidth = CONTENT_WIDTH - 38;
  const priceX = RIGHT_X;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);

  let rowHeight = LINE_ROW_HEIGHT;
  let textY = startY + 4.5;

  if (item.descriptionLines && item.descriptionLines.length > 1) {
    doc.setFont('helvetica', 'bold');
    doc.text(item.descriptionLines[0], MARGIN, textY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let lineY = textY + 4;
    for (let i = 1; i < item.descriptionLines.length; i += 1) {
      const wrapped = doc.splitTextToSize(item.descriptionLines[i], descMaxWidth);
      wrapped.forEach((line: string) => {
        doc.text(line, MARGIN, lineY);
        lineY += 3.8;
      });
    }
    rowHeight = Math.max(LINE_ROW_HEIGHT, lineY - startY);
    doc.setFontSize(9.5);
  } else {
    const wrapped = doc.splitTextToSize(item.description, descMaxWidth);
    if (wrapped.length > 1) {
      wrapped.forEach((line: string, index: number) => {
        doc.text(line, MARGIN, textY + index * 4);
      });
      rowHeight = Math.max(LINE_ROW_HEIGHT, wrapped.length * 4 + 1);
    } else {
      doc.text(item.description, MARGIN, textY);
    }
  }

  doc.text(formatMoney(item.price), priceX, startY + 4.5, { align: 'right' });

  const dividerY = startY + rowHeight;
  drawRowDivider(doc, dividerY);
  return dividerY + LINE_GAP;
}

function drawOptionBlock(
  ctx: PdfContext,
  startY: number,
  option: QuoteOption,
  optionLabel: string | null
): number {
  const { doc } = ctx;
  const { discount, subtotal, total } = option;
  let yPosition = startY;

  if (optionLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(optionLabel.toUpperCase(), MARGIN, yPosition, { charSpace: 0.9 });
    yPosition += 4;
  }

  for (const item of buildLineItems(option)) {
    yPosition = drawLineItemRow(ctx, yPosition, item);
  }

  if (discount && discount.amount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Subtotal', MARGIN, yPosition + 4.5);
    doc.text(formatMoney(subtotal), RIGHT_X, yPosition + 4.5, { align: 'right' });
    yPosition += LINE_ROW_HEIGHT;
    drawRowDivider(doc, yPosition);
    yPosition += LINE_GAP;

    const discountLabel = discount.note ? `Discount (${discount.note})` : 'Discount';
    doc.text(discountLabel, MARGIN, yPosition + 4.5);
    doc.text(`-${formatMoney(discount.amount)}`, RIGHT_X, yPosition + 4.5, { align: 'right' });
    yPosition += LINE_ROW_HEIGHT;
    drawRowDivider(doc, yPosition);
    yPosition += LINE_GAP + 2;
  } else {
    yPosition += 2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text('Total', MARGIN, yPosition + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text(formatMoney(total), RIGHT_X, yPosition + 5, { align: 'right' });

  return yPosition + TOTAL_ROW_HEIGHT;
}

function drawFooter(ctx: PdfContext, startY: number): number {
  const { doc } = ctx;
  let yPosition = startY;

  const panelPaddingX = 10;
  const panelPaddingY = 7;
  const thankYouText = 'Thank you for considering Photobooth Guys for your event.';
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  const thankYouLines = doc.splitTextToSize(thankYouText, CONTENT_WIDTH - panelPaddingX * 2);
  const panelHeight = thankYouLines.length * 4.8 + panelPaddingY * 2;

  drawRoundedFillRect(doc, MARGIN, yPosition, CONTENT_WIDTH, panelHeight, PANEL_RADIUS, PANEL_FILL);

  doc.setTextColor(INK[0], INK[1], INK[2]);
  thankYouLines.forEach((line: string, index: number) => {
    doc.text(line, PAGE_WIDTH / 2, yPosition + panelPaddingY + 3.5 + index * 4.8, { align: 'center' });
  });

  yPosition += panelHeight + 10;

  drawSpacedLabel(doc, 'Terms', MARGIN, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  TERMS.forEach((term) => {
    const lines = doc.splitTextToSize(term, CONTENT_WIDTH);
    lines.forEach((line: string) => {
      doc.text(line, MARGIN, yPosition);
      yPosition += 3.8;
    });
    yPosition += 0.8;
  });

  yPosition += 6;
  drawHairline(doc, yPosition);
  yPosition += 6;

  doc.setFontSize(7);
  doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
  doc.text('photoboothguys.ca · 647-378-5332', PAGE_WIDTH / 2, yPosition, { align: 'center' });

  return yPosition + 4;
}

export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();
    const payload = normalizeQuotePayload(quoteData);

    if (!payload) {
      return NextResponse.json({ error: 'Missing required quote data' }, { status: 400 });
    }

    const { contactInfo, options } = payload;
    const showOptionLabels = options.length > 1;
    const doc = new jsPDF('p', 'mm', 'a4');
    const ctx: PdfContext = { doc };

    let yPosition = drawSharedHeader(ctx, contactInfo);

    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const isLastOption = index === options.length - 1;
      const optionLabel = showOptionLabels ? `Option ${index + 1}` : null;
      const blockHeight = estimateOptionBlockHeight(option, Boolean(optionLabel));
      const reservedHeight = isLastOption
        ? blockHeight + FOOTER_TOP_SPACING + estimateFooterHeight()
        : blockHeight + OPTION_GAP;

      yPosition = ensureVerticalSpace(doc, yPosition, reservedHeight);
      yPosition = drawOptionBlock(ctx, yPosition, option, optionLabel);

      if (!isLastOption) {
        yPosition += OPTION_GAP;
      }
    }

    yPosition += FOOTER_TOP_SPACING;
    yPosition = ensureVerticalSpace(doc, yPosition, estimateFooterHeight());
    drawFooter(ctx, yPosition);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${contactInfo.name?.replace(/\s+/g, '-') || 'quote'}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
