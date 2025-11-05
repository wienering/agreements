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
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 15;

    // Header with gradient background effect
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PHOTO BOOTH QUOTE', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Photobooth Guys - Professional Photo Booth Rental Toronto', pageWidth / 2, 35, { align: 'center' });

    // Reset text color
    doc.setTextColor(51, 51, 51);
    yPosition = 60;

    // Client Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(102, 126, 234);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPosition, maxWidth, 8, 'F');
    doc.text('  CLIENT INFORMATION', margin + 2, yPosition + 6);

    yPosition += 12;
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(248, 249, 250);

    // Client info fields
    const clientFields = [
      { label: 'Full Name:', value: contactInfo.name || '' },
      { label: 'Email:', value: contactInfo.email || '' },
      { label: 'Phone:', value: contactInfo.phone || '' },
      { label: 'Event Date:', value: contactInfo.eventDate || '' }
    ];

    clientFields.forEach((field) => {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, yPosition - 2, 45, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.text(field.label, margin + 2, yPosition + 4);
      doc.setFillColor(255, 255, 255);
      doc.text(field.value, margin + 47, yPosition + 4);
      yPosition += 8;
    });

    yPosition += 8;

    // Package Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(102, 126, 234);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPosition, maxWidth, 8, 'F');
    doc.text('  PACKAGE DETAILS', margin + 2, yPosition + 6);

    yPosition += 12;
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(248, 249, 250);

    // Table header
    doc.rect(margin, yPosition - 2, 130, 8, 'F');
    doc.rect(margin + 130, yPosition - 2, 50, 8, 'F');
    doc.text('Item', margin + 2, yPosition + 4);
    doc.text('Price', margin + 180, yPosition + 4, { align: 'right' });

    yPosition += 8;

    // Base package
    doc.setFont('helvetica', 'normal');
    doc.rect(margin, yPosition - 2, 130, 8, 'S');
    doc.rect(margin + 130, yPosition - 2, 50, 8, 'S');
    doc.text(`${packageInfo.hours} Hour Photo Booth Package`, margin + 2, yPosition + 4);
    doc.text(`$${packageInfo.price.toLocaleString()}`, margin + 180, yPosition + 4, { align: 'right' });
    yPosition += 8;

    // Add-ons
    if (addons?.unlimitedPrints) {
      const isShortPackage = packageInfo.hours <= 3;
      const ratePerHour = isShortPackage ? 60 : 50;
      const unlimitedPrintsPrice = ratePerHour * packageInfo.hours;
      doc.rect(margin, yPosition - 2, 130, 8, 'S');
      doc.rect(margin + 130, yPosition - 2, 50, 8, 'S');
      doc.text('Unlimited Prints', margin + 2, yPosition + 4);
      doc.text(`$${unlimitedPrintsPrice.toLocaleString()}`, margin + 180, yPosition + 4, { align: 'right' });
      yPosition += 8;
    }

    if (addons?.glamBooth) {
      doc.rect(margin, yPosition - 2, 130, 8, 'S');
      doc.rect(margin + 130, yPosition - 2, 50, 8, 'S');
      doc.text('Glam Booth', margin + 2, yPosition + 4);
      doc.text('$75', margin + 180, yPosition + 4, { align: 'right' });
      yPosition += 8;
    }

    if (addons?.waitingTime && addons.waitingHours > 0) {
      const waitingTimePrice = 50 * addons.waitingHours;
      const hoursText = addons.waitingHours === 1 ? 'hour' : 'hours';
      doc.rect(margin, yPosition - 2, 130, 8, 'S');
      doc.rect(margin + 130, yPosition - 2, 50, 8, 'S');
      doc.text(`Waiting Time (${addons.waitingHours} ${hoursText})`, margin + 2, yPosition + 4);
      doc.text(`$${waitingTimePrice.toLocaleString()}`, margin + 180, yPosition + 4, { align: 'right' });
      yPosition += 8;
    }

    // Total row
    yPosition += 2;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(102, 126, 234);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPosition - 2, 130, 10, 'F');
    doc.rect(margin + 130, yPosition - 2, 50, 10, 'F');
    doc.text('TOTAL', margin + 2, yPosition + 5);
    doc.text(`$${total.toLocaleString()}`, margin + 180, yPosition + 5, { align: 'right' });

    yPosition += 15;
    doc.setTextColor(51, 51, 51);

    // Terms & Conditions
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = [
      '- A $100 retainer fee is required to secure your booking.',
      '- Balance due 7 days before event',
      '- Quote valid for 30 days from date of issue',
      '- Setup time included in package duration'
    ];
    terms.forEach((term) => {
      doc.text(term, margin, yPosition);
      yPosition += 5;
    });

    yPosition += 8;

    // Footer
    doc.setFillColor(248, 249, 250);
    const footerY = 250;
    doc.rect(margin, footerY, maxWidth, 30, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Contact Information', pageWidth / 2, footerY + 6, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Photobooth Guys', pageWidth / 2, footerY + 12, { align: 'center' });
    doc.text('Toronto | 647-378-5332 | info@photoboothguys.ca', pageWidth / 2, footerY + 17, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.text(`Quote Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageWidth / 2, footerY + 24, { align: 'center' });

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


