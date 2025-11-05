import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();

    // Validate required fields
    if (!quoteData.contactInfo || !quoteData.package || !quoteData.total) {
      return NextResponse.json(
        { error: 'Missing required quote data' },
        { status: 400 }
      );
    }

    const { contactInfo, package: packageInfo, addons, total } = quoteData;

    // Create PDF using jsPDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 15;

    // Color scheme
    const darkGray = [51, 51, 51]; // #333333
    const blue = [59, 130, 246]; // #3B82F6 - vibrant blue
    const lightGray = [156, 163, 175]; // #9CA3AF
    const white = [255, 255, 255];

    // Dark gray header bar at top
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Company branding on left (in header)
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Photobooth Guys', margin, 20);

    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Photo Booth Rental Toronto', margin, 28);

    // Contact info on top right (in header)
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const contactInfoX = pageWidth - margin;
    doc.text('647-378-5332', contactInfoX, 15, { align: 'right' });
    doc.text('info@photoboothguys.ca', contactInfoX, 20, { align: 'right' });
    doc.text('www.photoboothguys.ca', contactInfoX, 25, { align: 'right' });

    // Blue "QUOTE" banner on right
    const bannerWidth = 35;
    const bannerHeight = 15;
    const bannerX = pageWidth - margin - bannerWidth;
    const bannerY = 12;
    
    // Draw rectangle for banner
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(bannerX, bannerY, bannerWidth, bannerHeight, 'F');
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE', bannerX + bannerWidth / 2, bannerY + bannerHeight / 2 + 3, { align: 'center' });

    yPosition = 50;

    // Quote date in top right (where invoice details would be)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Quote Date:', contactInfoX, yPosition, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    const quoteDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    doc.text(quoteDate, contactInfoX, yPosition + 5, { align: 'right' });

    yPosition += 20;

    // "QUOTE TO:" section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('QUOTE TO:', margin, yPosition);

    yPosition += 8;

    // Client name (bold, larger)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((contactInfo.name || '').toUpperCase(), margin, yPosition);

    yPosition += 8;

    // Client contact details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (contactInfo.phone) {
      doc.text(`PHONE : ${contactInfo.phone}`, margin, yPosition);
      yPosition += 5;
    }
    if (contactInfo.email) {
      doc.text(`EMAIL : ${contactInfo.email}`, margin, yPosition);
      yPosition += 5;
    }
    if (contactInfo.eventDate) {
      doc.text(`EVENT DATE : ${contactInfo.eventDate}`, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 15;

    // Table header with rounded left corners
    const tableHeaderHeight = 10;
    const descColWidth = 100;
    const priceColWidth = 35;
    const qtyColWidth = 25;
    const totalColWidth = 35;

    // Item Description header (dark gray)
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(margin, yPosition, descColWidth, tableHeaderHeight, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM DESCRIPTION', margin + 5, yPosition + 7);

    // Unit Price header (blue)
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin + descColWidth, yPosition, priceColWidth, tableHeaderHeight, 'F');
    doc.text('UNIT PRICE', margin + descColWidth + priceColWidth / 2, yPosition + 7, { align: 'center' });

    // Quantity header (blue)
    doc.rect(margin + descColWidth + priceColWidth, yPosition, qtyColWidth, tableHeaderHeight, 'F');
    doc.text('QUANTITY', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 7, { align: 'center' });

    // Total header (blue)
    doc.rect(margin + descColWidth + priceColWidth + qtyColWidth, yPosition, totalColWidth, tableHeaderHeight, 'F');
    doc.text('TOTAL', margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 7, { align: 'center' });

    yPosition += tableHeaderHeight + 2;

    // Table rows
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);

    // Base package row
    const rowHeight = 8;
    doc.text(`${packageInfo.hours} Hour Photo Booth Package`, margin + 5, yPosition + 5);
    doc.text(`$${packageInfo.price.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
    doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
    doc.text(`$${packageInfo.price.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
    doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
    yPosition += rowHeight + 2;

    // Add-ons rows
    if (addons?.unlimitedPrints) {
      const isShortPackage = packageInfo.hours <= 3;
      const ratePerHour = isShortPackage ? 60 : 50;
      const unlimitedPrintsPrice = ratePerHour * packageInfo.hours;
      doc.text('Unlimited Prints', margin + 5, yPosition + 5);
      doc.text(`$${unlimitedPrintsPrice.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text(`$${unlimitedPrintsPrice.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    if (addons?.glamBooth) {
      doc.text('Glam Booth', margin + 5, yPosition + 5);
      doc.text('$75.00', margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('$75.00', margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    if (addons?.waitingTime && addons.waitingHours > 0) {
      const waitingTimePrice = 50 * addons.waitingHours;
      const hoursText = addons.waitingHours === 1 ? 'hour' : 'hours';
      doc.text(`Waiting Time (${addons.waitingHours} ${hoursText})`, margin + 5, yPosition + 5);
      doc.text(`$${waitingTimePrice.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text(`$${waitingTimePrice.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    yPosition += 10;

    // TOTAL in blue banner
    const totalBannerHeight = 15;
    const totalBannerWidth = descColWidth + priceColWidth + qtyColWidth + totalColWidth;
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin, yPosition, totalBannerWidth, totalBannerHeight, 'F');
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin + 10, yPosition + totalBannerHeight / 2 + 4);
    doc.text(`$${total.toFixed(2)}`, margin + totalBannerWidth - 10, yPosition + totalBannerHeight / 2 + 4, { align: 'right' });

    yPosition += totalBannerHeight + 20;

    // Bottom section - left side
    const bottomY = yPosition;
    
    // "Thank you" memo in dark gray banner
    const memoWidth = 90;
    const memoHeight = 12;
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(margin, bottomY, memoWidth, memoHeight, 'F');
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const thankYouText = doc.splitTextToSize('Thank you for considering Photobooth Guys for your event.', memoWidth - 10);
    const thankYouY = bottomY + (memoHeight - (thankYouText.length * 3)) / 2 + 3;
    thankYouText.forEach((line: string, index: number) => {
      doc.text(line, margin + 5, thankYouY + (index * 3));
    });

    // Terms & Conditions below memo
    yPosition = bottomY + memoHeight + 10;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = [
      'A $100 retainer fee is required to secure your booking.',
      'Balance due 7 days before event.',
      'Quote valid for 30 days from date of issue.',
      'Attendant will arrive 1 hour before the start time for set up.'
    ];
    
    terms.forEach((term) => {
      doc.text(term, margin, yPosition, { maxWidth: memoWidth });
      yPosition += 5;
    });

    // Bottom right - Dennis Larkin
    const rightY = bottomY + 15;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dennis Larkin', contactInfoX, rightY, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Photobooth Guys', contactInfoX, rightY + 6, { align: 'right' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${contactInfo.name?.replace(/\s+/g, '-') || 'quote'}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
