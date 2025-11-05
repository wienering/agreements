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
    const sidebarWidth = 20; // Width of left sidebar
    const mainMargin = 15;
    const mainStartX = sidebarWidth + mainMargin;
    const mainWidth = pageWidth - sidebarWidth - mainMargin * 2;
    let yPosition = 25;

    // Color scheme
    const darkTeal = [45, 64, 75]; // #2D404B
    const mutedGreen = [134, 176, 167]; // #86B0A7
    const offWhite = [248, 248, 248]; // #F8F8F8
    const darkGray = [51, 51, 51]; // #333333
    const lightGray = [200, 200, 200]; // #C8C8C8

    // Left sidebar with dark teal background
    doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
    doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

    // Vertical "QUOTE" text in sidebar - position letters vertically
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const quoteText = 'QUOTE';
    const quoteYStart = 80;
    const letterSpacing = 8;
    const centerX = sidebarWidth / 2;
    
    // Position each letter vertically (one below the other)
    for (let i = 0; i < quoteText.length; i++) {
      const yPos = quoteYStart + (i * letterSpacing);
      doc.text(quoteText[i], centerX, yPos, { align: 'center' });
    }

    // Main content area background (off-white)
    doc.setFillColor(offWhite[0], offWhite[1], offWhite[2]);
    doc.rect(sidebarWidth, 0, pageWidth - sidebarWidth, pageHeight, 'F');

    // Top header section with company info
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Photobooth Guys', mainStartX, yPosition);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Photo Booth Rental Toronto', mainStartX, yPosition + 6);
    
    // Contact info on the right
    doc.setFontSize(9);
    const contactInfoX = pageWidth - mainMargin;
    doc.text('info@photoboothguys.ca', contactInfoX, yPosition, { align: 'right' });
    doc.text('www.photoboothguys.ca', contactInfoX, yPosition + 4, { align: 'right' });
    doc.text('647-378-5332', contactInfoX, yPosition + 8, { align: 'right' });

    yPosition += 20;

    // BILL TO section (Client Information) with muted green background
    doc.setFillColor(mutedGreen[0], mutedGreen[1], mutedGreen[2]);
    doc.rect(mainStartX, yPosition, mainWidth, 8, 'F');
    
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', mainStartX + 2, yPosition + 6);

    yPosition += 12;

    // Client info fields
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const clientInfo = [
      contactInfo.name || 'N/A',
      contactInfo.email || 'N/A',
      contactInfo.phone || 'N/A',
      contactInfo.eventDate || 'N/A'
    ];

    clientInfo.forEach((info, index) => {
      doc.text(info, mainStartX + 2, yPosition + (index * 5));
    });

    yPosition += 25;

    // Table header with muted green background
    doc.setFillColor(mutedGreen[0], mutedGreen[1], mutedGreen[2]);
    doc.rect(mainStartX, yPosition, mainWidth, 8, 'F');
    
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Table headers - column positions
    const descX = mainStartX + 2;
    const priceX = mainStartX + mainWidth - 70; // Price column starts here
    const qtyX = mainStartX + mainWidth - 45; // QTY column starts here
    const totalX = mainStartX + mainWidth - 2; // Total column ends here
    
    doc.text('DESCRIPTION', descX, yPosition + 6);
    doc.text('PRICE', priceX + 15, yPosition + 6, { align: 'right' });
    doc.text('QTY', qtyX + 10, yPosition + 6, { align: 'right' });
    doc.text('TOTAL', totalX, yPosition + 6, { align: 'right' });

    yPosition += 10;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Row separator line
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.1);

    // Base package row
    doc.text(`${packageInfo.hours} Hour Photo Booth Package`, descX, yPosition + 4);
    doc.text(`$${packageInfo.price.toLocaleString()}`, priceX + 15, yPosition + 4, { align: 'right' });
    doc.text('1', qtyX + 10, yPosition + 4, { align: 'right' });
    doc.text(`$${packageInfo.price.toLocaleString()}`, totalX, yPosition + 4, { align: 'right' });
    doc.line(mainStartX, yPosition + 6, pageWidth - mainMargin, yPosition + 6);
    yPosition += 8;

    // Add-ons rows
    if (addons?.unlimitedPrints) {
      const isShortPackage = packageInfo.hours <= 3;
      const ratePerHour = isShortPackage ? 60 : 50;
      const unlimitedPrintsPrice = ratePerHour * packageInfo.hours;
      doc.text('Unlimited Prints', descX, yPosition + 4);
      doc.text(`$${unlimitedPrintsPrice.toLocaleString()}`, priceX + 15, yPosition + 4, { align: 'right' });
      doc.text('1', qtyX + 10, yPosition + 4, { align: 'right' });
      doc.text(`$${unlimitedPrintsPrice.toLocaleString()}`, totalX, yPosition + 4, { align: 'right' });
      doc.line(mainStartX, yPosition + 6, pageWidth - mainMargin, yPosition + 6);
      yPosition += 8;
    }

    if (addons?.glamBooth) {
      doc.text('Glam Booth', descX, yPosition + 4);
      doc.text('$75', priceX + 15, yPosition + 4, { align: 'right' });
      doc.text('1', qtyX + 10, yPosition + 4, { align: 'right' });
      doc.text('$75', totalX, yPosition + 4, { align: 'right' });
      doc.line(mainStartX, yPosition + 6, pageWidth - mainMargin, yPosition + 6);
      yPosition += 8;
    }

    if (addons?.waitingTime && addons.waitingHours > 0) {
      const waitingTimePrice = 50 * addons.waitingHours;
      const hoursText = addons.waitingHours === 1 ? 'hour' : 'hours';
      doc.text(`Waiting Time (${addons.waitingHours} ${hoursText})`, descX, yPosition + 4);
      doc.text(`$${waitingTimePrice.toLocaleString()}`, priceX + 15, yPosition + 4, { align: 'right' });
      doc.text('1', qtyX + 10, yPosition + 4, { align: 'right' });
      doc.text(`$${waitingTimePrice.toLocaleString()}`, totalX, yPosition + 4, { align: 'right' });
      doc.line(mainStartX, yPosition + 6, pageWidth - mainMargin, yPosition + 6);
      yPosition += 8;
    }

    yPosition += 10;

    // Bottom section: Payment Method on left, Summary box on right
    const bottomY = yPosition;
    const summaryWidth = 80;
    const summaryX = pageWidth - mainMargin - summaryWidth;
    const paymentWidth = summaryX - mainStartX - 10;

    // Payment Method section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHOD', mainStartX, bottomY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Account Number BankName', mainStartX, bottomY + 6);
    doc.text('Please contact us for payment details', mainStartX, bottomY + 11);

    // Summary box with muted green background
    doc.setFillColor(mutedGreen[0], mutedGreen[1], mutedGreen[2]);
    doc.rect(summaryX, bottomY - 5, summaryWidth, 35, 'F');
    
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const summaryStartY = bottomY + 2;
    doc.text('SUBTOTAL', summaryX + 2, summaryStartY);
    doc.text(`$${total.toLocaleString()}`, summaryX + summaryWidth - 2, summaryStartY, { align: 'right' });
    
    doc.text('TAX', summaryX + 2, summaryStartY + 8);
    doc.text('0%', summaryX + summaryWidth - 2, summaryStartY + 8, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text('TOTAL', summaryX + 2, summaryStartY + 18);
    doc.text(`$${total.toLocaleString()}`, summaryX + summaryWidth - 2, summaryStartY + 18, { align: 'right' });

    yPosition = bottomY + 40;

    // Terms & Conditions
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', mainStartX, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = [
      'A $100 retainer fee is required to secure your booking.',
      'Balance due 7 days before event.',
      'Quote valid for 30 days from date of issue.',
      'Setup time included in package duration.'
    ];
    
    terms.forEach((term) => {
      doc.text(term, mainStartX, yPosition);
      yPosition += 5;
    });

    // Footer with quote date
    yPosition += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Quote Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );

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
