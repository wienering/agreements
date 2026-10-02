export interface SignatureRecord {
  signerName: string;
  signerEmail: string;
  signedAt: string;
  method?: string;
}

export interface VerifiedContact {
  role: 'primary' | 'secondary';
  firstName: string;
  lastName: string;
  email: string;
}

export interface AgreementClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  eventDate: string | null;
  eventType: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: string | null;
  notes: string | null;
  address?: string | null;
}

export interface AgreementEvent {
  id?: string;
  eventDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  eventStartTime?: string | null;
  eventDuration?: string | null;
  eventPackage?: string | null;
  packagePrice?: number | string | null;
  notes?: string | null;
}

export interface AgreementRecord {
  id: string;
  client: AgreementClient;
  template: {
    title: string;
    htmlContent: string;
  };
  status: string;
  signedAt: string | null;
  signedFromIP: string | null;
  mergedHtml: string | null;
  customHtmlContent?: string | null;
  event?: AgreementEvent | null;
  fields?: Array<{
    key: string;
    value: string;
  }>;
  secondSignerEnabled?: boolean;
  requireBothSignatures?: boolean;
  secondSigner?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  signatures?: SignatureRecord[];
}

export type AgreementDocumentMode = 'sign' | 'readonly' | 'adminPreview';

export function viewerHasSigned(
  email: string | undefined,
  signatures: SignatureRecord[] | undefined,
): boolean {
  if (!email || !signatures) return false;
  return signatures.some((signature) => signature.signerEmail.toLowerCase() === email.toLowerCase());
}

export function renderedAgreementHtml(agreement: AgreementRecord, mode: 'sign' | 'adminPreview'): string {
  if (mode === 'adminPreview') {
    return agreement.template.htmlContent;
  }
  if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
    return agreement.mergedHtml;
  }
  return agreement.customHtmlContent || agreement.template.htmlContent;
}
