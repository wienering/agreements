import jsPDF from 'jspdf';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { formatDateTimeToronto, formatDateToronto } from '@/lib/dates';
import { isSigned } from '@/lib/agreementStatus';

/** US Letter width. jsPDF format "letter" is 215.9mm, not A4 210mm. */
const LETTER_WIDTH_MM = 215.9;
const LETTER_HEIGHT_MM = 279.4;

export type AgreementPdfLayout = 'document' | 'portal';

export interface AgreementPdfSignature {
  signerName: string;
  signerEmail: string;
  signedAt?: Date | string | null;
  ip?: string | null;
}

export interface AgreementPdfSource {
  id: string;
  status: string;
  mergedHtml?: string | null;
  customHtmlContent?: string | null;
  signedAt?: Date | string | null;
  signedFromIP?: string | null;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    eventDate?: Date | string | null;
  };
  template: {
    htmlContent: string;
  };
  event?: unknown;
  signatures?: AgreementPdfSignature[] | null;
  secondSignerEnabled?: boolean | null;
}

function resolveAgreementPdfHtml(agreement: AgreementPdfSource): string {
  // Priority: mergedHtml > customHtmlContent > template.htmlContent.
  // Signed agreements use the saved snapshot. Unsigned agreements are processed live.
  const htmlToProcess =
    isSigned(agreement.status) && agreement.mergedHtml
      ? agreement.mergedHtml
      : agreement.customHtmlContent || agreement.template.htmlContent;

  if (isSigned(agreement.status) && agreement.mergedHtml) {
    return agreement.mergedHtml;
  }

  return processHtmlContent(
    htmlToProcess,
    agreement.client,
    agreement.id,
    agreement.event,
    pickSecondSigner(agreement),
    { escapeValues: false },
  );
}

function convertHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<strong[^>]*>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<b[^>]*>/gi, '')
    .replace(/<\/b>/gi, '')
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<i[^>]*>/gi, '')
    .replace(/<\/i>/gi, '')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n');
}

function renderDocumentPdf(htmlContent: string, agreement: AgreementPdfSource): Buffer {
  const formattedText = convertHtmlToText(htmlContent);
  const signed = isSigned(agreement.status);
  const doc = new jsPDF('p', 'mm', 'letter');

  const pageWidth = LETTER_WIDTH_MM;
  const pageHeight = LETTER_HEIGHT_MM;
  const sideMargin = 30;
  const topMargin = 25;
  const bottomMargin = 15;
  const maxWidth = pageWidth - sideMargin * 2;
  const maxYPosition = pageHeight - bottomMargin;
  let yPosition = topMargin;

  const addText = (
    text: string,
    fontSize: number = 10,
    isBold: boolean = false,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > maxYPosition) {
        doc.addPage();
        yPosition = topMargin;
      }

      let xPosition = sideMargin;
      if (align === 'center') {
        xPosition = pageWidth / 2;
      } else if (align === 'right') {
        xPosition = pageWidth - sideMargin;
      }

      doc.text(line, xPosition, yPosition, { align });
      yPosition += fontSize * 0.4;
    });
  };

  addText('AGREEMENT DOCUMENT', 20, true, 'center');
  yPosition += 5;
  addText('Photobooth Guys - Service Agreement', 14, true, 'center');
  yPosition += 10;

  if (!signed) {
    addText('UNSIGNED DRAFT VERSION', 14, true, 'center');
    yPosition += 3;
    addText('This document is an unsigned draft and is NOT legally binding.', 10, false, 'center');
    yPosition += 3;
    addText(
      'This version is provided for review purposes only. The agreement becomes legally binding only after it has been digitally signed by all parties.',
      9,
      false,
      'center',
    );
    yPosition += 10;
  }

  addText('CLIENT INFORMATION:', 12, true);
  yPosition += 3;
  addText(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  addText(`Email: ${agreement.client.email}`);
  addText(`Phone: ${agreement.client.phone || 'Not provided'}`);
  addText(
    `Event Date: ${agreement.client.eventDate ? formatDateToronto(agreement.client.eventDate) : 'Not specified'}`,
  );
  yPosition += 8;

  addText('AGREEMENT CONTENT:', 12, true);
  yPosition += 3;

  const lines = formattedText.split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      addText(line.trim());
    } else {
      yPosition += 3;
    }
  });
  yPosition += 10;

  if (signed) {
    addText('DIGITAL SIGNATURE:', 12, true);
    yPosition += 3;

    const recorded = agreement.signatures;
    const signatures: AgreementPdfSignature[] =
      Array.isArray(recorded) && recorded.length > 0
        ? recorded
        : [
            {
              signerName: `${agreement.client.firstName} ${agreement.client.lastName}`,
              signerEmail: agreement.client.email,
              signedAt: agreement.signedAt,
              ip: agreement.signedFromIP,
            },
          ];

    addText(
      signatures.length > 1
        ? 'This agreement has been digitally signed by both parties:'
        : 'This agreement has been digitally signed by:',
    );
    yPosition += 2;

    signatures.forEach((signature, idx) => {
      if (signatures.length > 1) {
        addText(`Signer ${idx + 1}:`, 10, true);
      }
      addText(`Name: ${signature.signerName}`);
      addText(`Email: ${signature.signerEmail}`);
      // No signing date recorded (e.g. an old agreement marked completed by hand): leave the line off.
      const signedAt = signature.signedAt ?? agreement.signedAt;
      if (signedAt) {
        addText(`Date & Time Signed: ${formatDateTimeToronto(signedAt)}`);
      }
      addText(`IP Address: ${signature.ip || 'N/A'}`);
      yPosition += 3;
    });

    addText(`Agreement ID: ${agreement.id}`);
    addText(`Generated: ${formatDateTimeToronto(new Date())}`);
    yPosition += 8;
  } else {
    addText(`Agreement ID: ${agreement.id}`, 10, false);
    addText(`Generated: ${formatDateTimeToronto(new Date())}`, 10, false);
    yPosition += 8;
  }

  if (signed) {
    addText('This document is legally binding and represents the complete agreement between the parties.', 8, false, 'center');
  } else {
    addText('This is an unsigned draft version and is NOT legally binding.', 8, false, 'center');
  }
  addText('Photobooth Guys', 8, false, 'center');
  addText('Contact: info@photoboothguys.ca', 8, false, 'center');

  return Buffer.from(doc.output('arraybuffer'));
}

function renderPortalPdf(htmlContent: string, agreement: AgreementPdfSource): Buffer {
  const formattedText = convertHtmlToText(htmlContent);
  const doc = new jsPDF('p', 'mm', 'letter');

  const pageWidth = LETTER_WIDTH_MM;
  const margin = 25;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = 25;

  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, lineHeight: number = 7) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);

    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  addText('Agreement Document', 16, true, 10);
  yPosition += 5;

  addText(`Client: ${agreement.client.firstName} ${agreement.client.lastName}`, 12, false);
  addText(`Agreement ID: ${agreement.id}`, 10, false);
  if (agreement.signedAt) {
    addText(`Signed: ${formatDateToronto(agreement.signedAt)}`, 10, false);
  }
  yPosition += 10;

  addText(formattedText, 10, false);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateAgreementPdf(
  agreement: AgreementPdfSource,
  layout: AgreementPdfLayout,
): Promise<Buffer> {
  const html = resolveAgreementPdfHtml(agreement);

  if (layout === 'portal') {
    return renderPortalPdf(html, agreement);
  }

  return renderDocumentPdf(html, agreement);
}
