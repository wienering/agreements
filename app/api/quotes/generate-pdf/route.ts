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
const MARGIN = 15;
const BOTTOM_MARGIN = 15;
const BORDER_RADIUS = 3;
const TABLE_HEADER_HEIGHT = 10;
const DESC_COL_WIDTH = 100;
const PRICE_COL_WIDTH = 35;
const QTY_COL_WIDTH = 25;
const TOTAL_COL_WIDTH = 35;
const TABLE_WIDTH = DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH;
const ROW_HEIGHT = 8;
const TOTAL_BANNER_HEIGHT = 15;
const FOOTER_TOP_SPACING = 20;
const OPTION_GAP = 12;
const OPTION_LABEL_HEIGHT = 10;

const DARK_GRAY: [number, number, number] = [51, 51, 51];
const BLUE: [number, number, number] = [59, 130, 246];
const LIGHT_GRAY: [number, number, number] = [156, 163, 175];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [220, 38, 38];

type PdfContext = {
  doc: jsPDF;
  drawRoundedRectLeft: (x: number, y: number, w: number, h: number, r: number) => void;
  drawRoundedRectBlue: (x: number, y: number, w: number, h: number, r: number) => void;
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

function createPdfContext(doc: jsPDF): PdfContext {
  const drawRoundedRectLeft = (x: number, y: number, w: number, h: number, r: number) => {
    doc.setFillColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.rect(x + r, y, w - r, h, 'F');
    doc.rect(x, y + r, r, h - 2 * r, 'F');
    doc.circle(x + r, y + r, r, 'F');
    doc.circle(x + r, y + h - r, r, 'F');
  };

  const drawRoundedRectBlue = (x: number, y: number, w: number, h: number, r: number) => {
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.rect(x + r, y, w - r, h, 'F');
    doc.rect(x, y + r, r, h - 2 * r, 'F');
    doc.circle(x + r, y + r, r, 'F');
    doc.circle(x + r, y + h - r, r, 'F');
  };

  return { doc, drawRoundedRectLeft, drawRoundedRectBlue };
}

function estimateFooterHeight(): number {
  const memoHeight = 12;
  const termsHeight = 6 + 4 * 5;
  return memoHeight + 10 + termsHeight;
}

function estimateOptionBlockHeight(option: QuoteOption, showOptionLabel: boolean): number {
  let height = TABLE_HEADER_HEIGHT + 2 + ROW_HEIGHT + 2;

  if (showOptionLabel) {
    height += OPTION_LABEL_HEIGHT;
  }

  const { package: packageInfo, addons, discount } = option;

  if (packageInfo.kind === 'custom' && packageInfo.description?.trim()) {
    const descLines = Math.ceil(packageInfo.description.trim().length / 40);
    height += Math.max(0, descLines * 4);
  }

  if (addons.unlimitedPrints && packageInfo.kind === 'standard') {
    height += ROW_HEIGHT + 2;
  }
  if (addons.glamBooth) {
    height += ROW_HEIGHT + 2;
  }
  if (addons.waitingTime && (addons.waitingHours ?? 0) > 0) {
    height += ROW_HEIGHT + 2;
  }
  if (discount && discount.amount > 0) {
    height += 5 + (ROW_HEIGHT + 2) * 2;
  }

  height += 10 + TOTAL_BANNER_HEIGHT;
  return height;
}

function ensureVerticalSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight <= PAGE_HEIGHT - BOTTOM_MARGIN) {
    return y;
  }
  doc.addPage();
  return MARGIN;
}

function drawSharedHeader(ctx: PdfContext, contactInfo: ContactInfo): number {
  const { doc, drawRoundedRectBlue } = ctx;
  let yPosition = MARGIN;

  doc.setFillColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
  doc.rect(0, 0, PAGE_WIDTH, 50, 'F');

  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Photobooth Guys', MARGIN, 20);

  doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Photo Booth Rental Toronto', MARGIN, 28);

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(9);
  doc.text('647-378-5332', MARGIN, 35);
  doc.text('info@photoboothguys.ca', MARGIN, 39);
  doc.text('www.photoboothguys.ca', MARGIN, 43);

  const contactInfoX = PAGE_WIDTH - MARGIN;
  const bannerWidth = 35;
  const bannerHeight = 15;
  const bannerX = PAGE_WIDTH - MARGIN - bannerWidth;
  const bannerY = 12;

  drawRoundedRectBlue(bannerX, bannerY, bannerWidth, bannerHeight, BORDER_RADIUS);

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Quote', bannerX + bannerWidth / 2, bannerY + bannerHeight / 2 + 3, { align: 'center' });

  yPosition = 60;

  doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Quote Date:', contactInfoX, yPosition, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const quoteDate = new Date().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(quoteDate, contactInfoX, yPosition + 5, { align: 'right' });

  yPosition += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
  doc.text('Quote To:', MARGIN, yPosition);

  yPosition += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const clientName = contactInfo.name || '';
  const titleCaseName = clientName.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
  doc.text(titleCaseName, MARGIN, yPosition);

  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (contactInfo.phone) {
    doc.text(`Phone : ${contactInfo.phone}`, MARGIN, yPosition);
    yPosition += 5;
  }
  if (contactInfo.email) {
    doc.text(`Email : ${contactInfo.email}`, MARGIN, yPosition);
    yPosition += 5;
  }
  if (contactInfo.eventDate) {
    doc.text(`Event Date : ${contactInfo.eventDate}`, MARGIN, yPosition);
    yPosition += 5;
  }

  return yPosition + 15;
}

function drawOptionBlock(
  ctx: PdfContext,
  startY: number,
  option: QuoteOption,
  optionLabel: string | null
): number {
  const { doc, drawRoundedRectLeft, drawRoundedRectBlue } = ctx;
  const { package: packageInfo, addons, discount, subtotal, total } = option;
  let yPosition = startY;

  if (optionLabel) {
    doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(optionLabel, MARGIN, yPosition);
    yPosition += OPTION_LABEL_HEIGHT;
  }

  drawRoundedRectLeft(MARGIN, yPosition, DESC_COL_WIDTH, TABLE_HEADER_HEIGHT, BORDER_RADIUS);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Item Description', MARGIN + 5, yPosition + 7);

  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(MARGIN + DESC_COL_WIDTH, yPosition, PRICE_COL_WIDTH, TABLE_HEADER_HEIGHT, 'F');
  doc.text('Unit Price', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH / 2, yPosition + 7, { align: 'center' });

  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH, yPosition, QTY_COL_WIDTH, TABLE_HEADER_HEIGHT, 'F');
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text('Qty', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH / 2, yPosition + 7, {
    align: 'center',
  });

  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.rect(
    MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH,
    yPosition,
    TOTAL_COL_WIDTH,
    TABLE_HEADER_HEIGHT,
    'F'
  );
  doc.text(
    'Price',
    MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
    yPosition + 7,
    { align: 'center' }
  );

  yPosition += TABLE_HEADER_HEIGHT + 2;

  doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);

  const descMaxW = DESC_COL_WIDTH - 10;
  const lineGap = 4.5;
  let baseRowHeight = ROW_HEIGHT;
  let priceY = yPosition + 5;

  if (packageInfo.kind === 'standard') {
    doc.text(`${packageInfo.hours} Hour Photo Booth Package`, MARGIN + 5, yPosition + 5);
  } else {
    let lineY = yPosition + 5;
    let lineCount = 0;
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(packageInfo.title, descMaxW);
    titleLines.forEach((line: string) => {
      doc.text(line, MARGIN + 5, lineY);
      lineY += lineGap;
      lineCount += 1;
    });
    doc.setFont('helvetica', 'normal');
    if (packageInfo.description?.trim()) {
      doc.setFontSize(8);
      const bodyLines = doc.splitTextToSize(packageInfo.description.trim(), descMaxW);
      bodyLines.forEach((line: string) => {
        doc.text(line, MARGIN + 5, lineY);
        lineY += lineGap - 0.5;
        lineCount += 1;
      });
      doc.setFontSize(9);
    }
    baseRowHeight = Math.max(ROW_HEIGHT, 4 + lineCount * lineGap);
    priceY = yPosition + Math.min(5, baseRowHeight / 2);
  }

  doc.text(
    `$${packageInfo.price.toFixed(2)}`,
    MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH / 2,
    priceY,
    { align: 'center' }
  );
  doc.text('1', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH / 2, priceY, { align: 'center' });
  doc.text(
    `$${packageInfo.price.toFixed(2)}`,
    MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
    priceY,
    { align: 'center' }
  );

  doc.line(MARGIN, yPosition + baseRowHeight, MARGIN + TABLE_WIDTH, yPosition + baseRowHeight);
  yPosition += baseRowHeight + 2;

  if (addons.unlimitedPrints && packageInfo.kind === 'standard') {
    const isShortPackage = packageInfo.hours <= 3;
    const ratePerHour = isShortPackage ? 60 : 50;
    const unlimitedPrintsPrice = ratePerHour * packageInfo.hours;

    doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.text('Unlimited Prints', MARGIN + 5, yPosition + 5);
    doc.text(
      `$${unlimitedPrintsPrice.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );
    doc.text('1', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH / 2, yPosition + 5, {
      align: 'center',
    });
    doc.text(
      `$${unlimitedPrintsPrice.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );

    doc.line(MARGIN, yPosition + ROW_HEIGHT, MARGIN + TABLE_WIDTH, yPosition + ROW_HEIGHT);
    yPosition += ROW_HEIGHT + 2;
  }

  if (addons.glamBooth) {
    doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.text('Glam Booth', MARGIN + 5, yPosition + 5);
    doc.text('$75.00', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH / 2, yPosition + 5, { align: 'center' });
    doc.text('1', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH / 2, yPosition + 5, {
      align: 'center',
    });
    doc.text('$75.00', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2, yPosition + 5, {
      align: 'center',
    });

    doc.line(MARGIN, yPosition + ROW_HEIGHT, MARGIN + TABLE_WIDTH, yPosition + ROW_HEIGHT);
    yPosition += ROW_HEIGHT + 2;
  }

  if (addons.waitingTime && (addons.waitingHours ?? 0) > 0) {
    const waitingHours = addons.waitingHours ?? 0;
    const waitingTimePrice = 50 * waitingHours;
    const hoursText = waitingHours === 1 ? 'hour' : 'hours';

    doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.text(`Waiting Time (${waitingHours} ${hoursText})`, MARGIN + 5, yPosition + 5);
    doc.text(
      `$${waitingTimePrice.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );
    doc.text('1', MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH / 2, yPosition + 5, {
      align: 'center',
    });
    doc.text(
      `$${waitingTimePrice.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );

    doc.line(MARGIN, yPosition + ROW_HEIGHT, MARGIN + TABLE_WIDTH, yPosition + ROW_HEIGHT);
    yPosition += ROW_HEIGHT + 2;
  }

  if (discount && discount.amount > 0) {
    yPosition += 5;
    doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal', MARGIN + 5, yPosition + 5);
    doc.text(
      `$${subtotal.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );
    yPosition += ROW_HEIGHT + 2;

    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.setFont('helvetica', 'normal');
    const discountLabel = discount.note ? `Discount (${discount.note})` : 'Discount';
    doc.text(discountLabel, MARGIN + 5, yPosition + 5);
    doc.text(
      `-$${discount.amount.toFixed(2)}`,
      MARGIN + DESC_COL_WIDTH + PRICE_COL_WIDTH + QTY_COL_WIDTH + TOTAL_COL_WIDTH / 2,
      yPosition + 5,
      { align: 'center' }
    );

    doc.line(MARGIN, yPosition + ROW_HEIGHT, MARGIN + TABLE_WIDTH, yPosition + ROW_HEIGHT);
    yPosition += ROW_HEIGHT + 2;
  }

  yPosition += 10;

  drawRoundedRectBlue(MARGIN, yPosition, TABLE_WIDTH, TOTAL_BANNER_HEIGHT, BORDER_RADIUS);

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', MARGIN + 10, yPosition + TOTAL_BANNER_HEIGHT / 2 + 4);
  doc.text(`$${total.toFixed(2)}`, MARGIN + TABLE_WIDTH - 10, yPosition + TOTAL_BANNER_HEIGHT / 2 + 4, {
    align: 'right',
  });

  return yPosition + TOTAL_BANNER_HEIGHT;
}

function drawFooter(ctx: PdfContext, startY: number): number {
  const { doc, drawRoundedRectLeft } = ctx;
  let yPosition = startY;

  const memoWidth = 140;
  const memoHeight = 12;
  drawRoundedRectLeft(MARGIN, yPosition, memoWidth, memoHeight, BORDER_RADIUS);

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const thankYouText = 'Thank You For Considering Photobooth Guys For Your Event.';
  doc.text(thankYouText, MARGIN + memoWidth / 2, yPosition + memoHeight / 2 + 3, { align: 'center' });

  yPosition += memoHeight + 10;
  doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', MARGIN, yPosition);

  yPosition += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const terms = [
    'A $100 retainer fee is required to secure your booking.',
    'Balance due 7 days before event.',
    'Quote valid for 30 days from date of issue.',
    'Attendant will arrive 1 hour before the start time for set up.',
  ];

  terms.forEach((term) => {
    doc.text(term, MARGIN, yPosition, { maxWidth: memoWidth });
    yPosition += 5;
  });

  return yPosition;
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
    const ctx = createPdfContext(doc);

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
