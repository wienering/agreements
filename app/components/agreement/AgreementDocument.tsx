'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { UIcon } from '@/app/components/UIcon';
import { sanitizeAgreementHtml } from '@/lib/sanitizeHtml';
import { formatDateTimeToronto, formatDateToronto } from '@/lib/dates';
import { isSigned } from '@/lib/agreementStatus';
import { EmailCopyModal } from './EmailCopyModal';
import { renderedAgreementHtml, type AgreementRecord } from './types';
import type { useAgreementDelivery } from './useAgreementDelivery';

type Delivery = ReturnType<typeof useAgreementDelivery>;

type EventKey = 'eventDate' | 'eventType' | 'eventLocation' | 'eventStartTime' | 'eventDuration' | 'eventPackage';

function eventField(agreement: AgreementRecord, key: EventKey): string | null {
  const value = agreement.event?.[key] ?? agreement.client[key];
  return value ? String(value) : null;
}

type AgreementDocumentProps =
  | {
      mode: 'sign';
      agreement: AgreementRecord;
      delivery: Delivery;
      isSigning: boolean;
      alreadySigned: boolean;
      onSign: () => void;
      signButtonRef: RefObject<HTMLButtonElement>;
    }
  | {
      mode: 'adminPreview';
      agreement: AgreementRecord;
      delivery: Delivery;
    }
  | {
      mode: 'readonly';
      html: string | null;
    };

export function AdminPreviewBanner() {
  return (
    <div className="border-b-[3px] border-hairline bg-accent py-3 text-center text-accent-on">
      <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-3 px-6">
        <UIcon name="eye" className="text-lg" />
        <span className="text-base font-semibold">
          ADMIN PREVIEW MODE - This is how the client will see the agreement
        </span>
      </div>
    </div>
  );
}

export function UnverifiedAgreementHeader() {
  return (
    <div className="mb-8 border-b border-hairline bg-panel py-5">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6">
        <BrandLockup />
      </div>
    </div>
  );
}

export function AgreementDocument(props: AgreementDocumentProps) {
  if (props.mode === 'readonly') {
    return <ReadonlyAgreementBody html={props.html} />;
  }

  const { mode, agreement, delivery } = props;
  const responsive = mode === 'sign';
  const html = renderedAgreementHtml(agreement);
  const eventDate = eventField(agreement, 'eventDate');
  const eventType = eventField(agreement, 'eventType');
  const eventLocation = eventField(agreement, 'eventLocation');
  const eventStartTime = eventField(agreement, 'eventStartTime');
  const eventDuration = eventField(agreement, 'eventDuration');
  const eventPackage = eventField(agreement, 'eventPackage');
  const showEvent = Boolean(eventDate || eventType || eventLocation);

  return (
    <div className="mx-auto max-w-[1200px] px-6">
      <div className="mb-8 border-b border-hairline bg-panel py-5">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6">
          <BrandLockup />
          <div className="flex flex-wrap items-center gap-3">
            <InfoCard label="CLIENT" minWidth="min-w-[200px]">
              <p className="mb-1 text-base font-bold text-ink">
                {agreement.client.firstName} {agreement.client.lastName}
              </p>
              {agreement.client.phone && (
                <IconLine icon="phone-call" iconClass="text-xs">
                  {agreement.client.phone}
                </IconLine>
              )}
              <IconLine icon="envelope" iconClass="text-xs" className="mb-0">
                {agreement.client.email}
              </IconLine>
            </InfoCard>

            {showEvent && (
              <InfoCard label="EVENT" minWidth="min-w-[200px]">
                {eventDate && (
                  <p className="mb-1 text-sm font-semibold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <UIcon name="calendar" className="text-sm" />
                      {formatDateToronto(eventDate, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                )}
                {eventType && <IconLine icon="star">{eventType}</IconLine>}
                {eventLocation && <IconLine icon="marker">{eventLocation}</IconLine>}
                {eventStartTime && <IconLine icon="clock">{eventStartTime}</IconLine>}
                {eventDuration && (
                  <IconLine icon="hourglass" className="mb-0">
                    {eventDuration}
                  </IconLine>
                )}
              </InfoCard>
            )}

            {eventPackage && (
              <InfoCard label="PACKAGE" minWidth="min-w-[150px]">
                <p className="text-sm font-semibold text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <UIcon name="box" className="text-sm" />
                    {eventPackage}
                  </span>
                </p>
              </InfoCard>
            )}

            {isSigned(agreement.status) && (
              <div className="flex items-center gap-2 rounded border border-hairline bg-panel px-4 py-2">
                <UIcon name="check" className="text-base text-success" />
                <span className="text-sm font-semibold text-success">SIGNED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded border border-hairline bg-panel p-10 text-center">
        <h1 className="font-display text-[32px] font-extrabold leading-[1.2] text-ink">
          {agreement.template.title}
        </h1>
        <div className="mb-4 mt-3 h-px w-full bg-rule-strong" aria-hidden="true" />
        <p className="mb-6 text-lg leading-[1.4] text-muted">
          Service Agreement for {agreement.client.firstName} {agreement.client.lastName}
        </p>

        {isSigned(agreement.status) && (
          <div className="mt-6 inline-block rounded border border-hairline bg-panel p-5">
            <div className="mb-2 flex items-center justify-center gap-3">
              <UIcon name="check" className="text-xl text-success" />
              <span className="text-base font-semibold text-success">Agreement Successfully Signed</span>
            </div>
            <p className="text-sm text-muted">This agreement has been digitally signed and is legally binding.</p>
          </div>
        )}

        {mode === 'sign' &&
          !isSigned(agreement.status) &&
          agreement.requireBothSignatures &&
          (agreement.signatures?.length ?? 0) > 0 && (
            <PartialSignatureBanner agreement={agreement} />
          )}
      </div>

      <div className="mb-8 rounded border border-hairline bg-panel p-6">
        <div
          className="rounded border border-hairline bg-white p-8 font-ui text-base leading-[1.7] text-ink"
          dangerouslySetInnerHTML={{ __html: sanitizeAgreementHtml(html) }}
        />
      </div>

      {mode === 'sign' ? (
        <SignSignatureDetails agreement={agreement} />
      ) : (
        <AdminSignatureDetails agreement={agreement} />
      )}

      {mode === 'sign' ? (
        <SignActions
          agreement={agreement}
          delivery={delivery}
          isSigning={props.isSigning}
          alreadySigned={props.alreadySigned}
          onSign={props.onSign}
          signButtonRef={props.signButtonRef}
        />
      ) : (
        <AdminActions delivery={delivery} />
      )}

      {delivery.showEmailModal && (
        <EmailCopyModal
          emailAddress={delivery.emailAddress}
          onEmailChange={delivery.setEmailAddress}
          emailError={delivery.emailError}
          isEmailing={delivery.isEmailing}
          displayTitle={mode === 'sign'}
          responsive={responsive}
          onCancel={delivery.handleCloseEmail}
          onSend={delivery.handleSendEmail}
        />
      )}

      <AgreementFooter />
    </div>
  );
}

function ReadonlyAgreementBody({ html }: { html: string | null }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAgreementExpanded, setIsAgreementExpanded] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(false);

  useEffect(() => {
    if (contentRef.current && html) {
      const element = contentRef.current;
      const checkHeight = () => {
        const maxHeight = 30 * 16;
        setHasMoreContent(element.scrollHeight > maxHeight);
      };
      checkHeight();
      const timeoutId = setTimeout(checkHeight, 100);
      return () => clearTimeout(timeoutId);
    }
    setHasMoreContent(false);
  }, [html]);

  const collapsed = !isAgreementExpanded && hasMoreContent;

  return (
    <div className="rounded-lg border border-hairline bg-panel p-6">
      <h2 className="mb-4 text-xl font-semibold text-ink">Agreement Content</h2>
      {html ? (
        <div>
          <div
            ref={contentRef}
            className={`prose max-w-none text-ink transition-all duration-300 ${
              collapsed
                ? 'max-h-[30rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]'
                : ''
            }`}
            dangerouslySetInnerHTML={{ __html: sanitizeAgreementHtml(html) }}
          />
          {hasMoreContent && (
            <div className="mt-4 border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => setIsAgreementExpanded(!isAgreementExpanded)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-panel px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-hairline"
              >
                <span>{isAgreementExpanded ? 'Show Less' : 'Show More'}</span>
                <svg
                  className={`h-5 w-5 transition-transform ${isAgreementExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted">No content available for this agreement.</p>
      )}
    </div>
  );
}

function PartialSignatureBanner({ agreement }: { agreement: AgreementRecord }) {
  const first = agreement.signatures?.[0];
  const pending =
    agreement.secondSigner && agreement.signatures ? otherSigner(agreement) : null;

  return (
    <div className="mt-6 inline-block max-w-[640px] rounded border border-warn bg-panel p-5 text-left">
      <div className="mb-2 flex items-center gap-3">
        <UIcon name="hourglass" className="text-xl text-warn" />
        <span className="text-base font-semibold text-warn">Waiting on the other signer</span>
      </div>
      <p className="mb-2 text-sm text-muted">
        {first ? (
          <>
            Signed by <strong>{first.signerName}</strong> ({first.signerEmail}).
          </>
        ) : null}{' '}
        Both signatures are required for this agreement to become binding.
      </p>
      {pending && (
        <p className="text-[13px] text-muted">
          Awaiting signature from <strong>{pending.name}</strong> ({pending.email}).
        </p>
      )}
    </div>
  );
}

function otherSigner(agreement: AgreementRecord): { name: string; email: string } {
  const second = agreement.secondSigner!;
  const signedEmails = (agreement.signatures || []).map((signature) => (signature.signerEmail || '').toLowerCase());
  const primaryEmailLower = (agreement.client.email || '').toLowerCase();
  const secondaryEmailLower = (second.email || '').toLowerCase();
  const name = signedEmails.includes(primaryEmailLower)
    ? `${second.firstName || ''} ${second.lastName || ''}`.trim() || second.email
    : `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim() || agreement.client.email;
  const email = signedEmails.includes(primaryEmailLower) ? secondaryEmailLower : primaryEmailLower;
  return { name, email };
}

function SignSignatureDetails({ agreement }: { agreement: AgreementRecord }) {
  if (!(isSigned(agreement.status) || (agreement.signatures?.length ?? 0) > 0)) return null;

  const rows =
    agreement.signatures && agreement.signatures.length > 0
      ? agreement.signatures.map((signature) => ({
          signerName: signature.signerName,
          signerEmail: signature.signerEmail,
          signedAt: signature.signedAt,
          ip: null as string | null,
        }))
      : [
          {
            signerName: `${agreement.client.firstName} ${agreement.client.lastName}`.trim(),
            signerEmail: agreement.client.email,
            signedAt: agreement.signedAt,
            ip: agreement.signedFromIP,
          },
        ];

  return (
    <section className="mb-8 rounded border border-hairline bg-panel p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-lg">
          <UIcon name="signature" className="text-lg text-muted" />
        </div>
        <h3 className="text-xl font-bold text-ink">Digital Signature Details</h3>
      </div>
      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <div
            key={`${row.signerEmail}-${index}`}
            className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded border-l-[3px] border-success bg-paper p-4"
          >
            <Detail label="SIGNED BY" value={row.signerName} />
            <Detail label="EMAIL" value={row.signerEmail} />
            <Detail label="DATE & TIME SIGNED" value={row.signedAt ? formatDateTimeToronto(row.signedAt) : 'N/A'} />
            {row.ip && <Detail label="IP ADDRESS" value={row.ip} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminSignatureDetails({ agreement }: { agreement: AgreementRecord }) {
  if (!isSigned(agreement.status)) return null;

  return (
    <section className="mb-8 rounded border border-hairline bg-panel p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-lg">
          <UIcon name="signature" className="text-lg text-muted" />
        </div>
        <h3 className="text-xl font-bold text-ink">Digital Signature Details</h3>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Detail label="SIGNED BY" value={`${agreement.client.firstName} ${agreement.client.lastName}`} />
        <Detail label="EMAIL" value={agreement.client.email} />
        <Detail label="DATE & TIME SIGNED" value={agreement.signedAt ? formatDateTimeToronto(agreement.signedAt) : 'N/A'} />
        <Detail label="IP ADDRESS" value={agreement.signedFromIP || 'N/A'} />
      </div>
    </section>
  );
}

function SignActions({
  agreement,
  delivery,
  isSigning,
  alreadySigned,
  onSign,
  signButtonRef,
}: {
  agreement: AgreementRecord;
  delivery: Delivery;
  isSigning: boolean;
  alreadySigned: boolean;
  onSign: () => void;
  signButtonRef: RefObject<HTMLButtonElement>;
}) {
  const signBlocked = isSigning || alreadySigned;
  const label = isSigning
    ? 'Signing...'
    : alreadySigned
      ? "You've signed — waiting on the other party"
      : 'Sign Agreement';

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-3 px-4 md:mb-10 md:gap-5 md:px-0">
      {isSigned(agreement.status) ? (
        <>
          <FillButton onClick={delivery.handleDownloadPDF} disabled={delivery.isDownloading}>
            <ActionIcon busy={delivery.isDownloading} name="file-pdf" />{' '}
            {delivery.isDownloading ? 'Downloading...' : 'Download PDF'}
          </FillButton>
          <FillButton onClick={delivery.handleEmailAgreement} disabled={delivery.isEmailing}>
            <ActionIcon busy={delivery.isEmailing} name="envelope" />{' '}
            {delivery.isEmailing ? 'Sending...' : 'Email Copy'}
            {delivery.showEmailSentToast && <SentToast />}
          </FillButton>
          <a
            href="/portal/login"
            className="flex min-w-[180px] items-center justify-center gap-3 rounded border-none bg-accent px-8 py-4 text-base font-semibold text-accent-on no-underline transition-all hover:-translate-y-0.5 hover:opacity-90"
          >
            <UIcon name="door-open" className="text-lg" />
            Client Portal
          </a>
        </>
      ) : (
        <>
          <button
            type="button"
            ref={signButtonRef}
            onClick={onSign}
            disabled={signBlocked}
            className={`flex min-w-[220px] items-center justify-center gap-3 rounded border-none px-10 py-5 text-lg font-bold transition-all ${
              isSigning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } ${
              signBlocked
                ? 'bg-hairline text-muted'
                : 'bg-accent text-accent-on enabled:hover:-translate-y-0.5 enabled:hover:opacity-90'
            }`}
          >
            <ActionIcon busy={isSigning} name="signature" /> {label}
          </button>
          <button
            type="button"
            onClick={delivery.handleDownloadPDF}
            disabled={delivery.isDownloading}
            className={`flex min-w-[220px] items-center justify-center gap-3 rounded border border-hairline px-8 py-4 text-base font-semibold transition-all ${
              delivery.isDownloading
                ? 'cursor-not-allowed bg-hairline text-muted'
                : 'cursor-pointer bg-transparent text-ink hover:bg-panel'
            }`}
          >
            <ActionIcon busy={delivery.isDownloading} name="file-pdf" />{' '}
            {delivery.isDownloading ? 'Downloading...' : 'Download PDF (Unsigned)'}
          </button>
        </>
      )}
    </div>
  );
}

function AdminActions({ delivery }: { delivery: Delivery }) {
  return (
    <div className="mb-10 flex flex-wrap justify-center gap-5">
      <FillButton onClick={delivery.handleDownloadPDF} disabled={delivery.isDownloading}>
        <ActionIcon busy={delivery.isDownloading} name="file-pdf" />{' '}
        {delivery.isDownloading ? 'Downloading...' : 'Download PDF'}
      </FillButton>
      <FillButton onClick={delivery.handleEmailAgreement} disabled={delivery.isEmailing}>
        <ActionIcon busy={delivery.isEmailing} name="envelope" />{' '}
        {delivery.isEmailing ? 'Sending...' : 'Email Copy'}
        {delivery.showEmailSentToast && <SentToast />}
      </FillButton>
    </div>
  );
}

function AgreementFooter() {
  return (
    <div className="mt-[60px] border-t border-hairline bg-panel py-8">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-accent text-sm font-bold text-accent-on">
            <UIcon name="camera" className="text-sm text-accent-on" />
          </div>
          <h3 className="text-lg font-bold text-ink">Photobooth Guys</h3>
        </div>
        <p className="mb-4 text-sm text-muted">Professional photo booth services for your special events</p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <UIcon name="envelope" className="text-xs" />
            info@photoboothguys.ca
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UIcon name="phone-call" className="text-xs" />
            647-378-5332
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UIcon name="globe" className="text-xs" />
            Toronto, Ontario
          </span>
        </div>
        <div className="mt-4 rounded border border-hairline bg-paper p-3 text-xs text-muted">
          <p>
            This agreement was generated and signed using our secure digital platform. All signatures are legally binding
            and timestamped.
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-accent text-lg font-bold text-accent-on">
        <UIcon name="camera" className="text-lg text-accent-on" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">Photobooth Guys</h1>
        <p className="text-sm text-muted">Service Agreement</p>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  minWidth,
  children,
}: {
  label: string;
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded border border-hairline bg-paper px-4 py-3 ${minWidth}`}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted">{label}</p>
      {children}
    </div>
  );
}

function IconLine({
  icon,
  children,
  className = 'mb-1',
  iconClass = 'text-xs',
}: {
  icon: string;
  children: ReactNode;
  className?: string;
  iconClass?: string;
}) {
  return (
    <p className={`text-xs font-medium text-muted ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <UIcon name={icon} className={iconClass} />
        {children}
      </span>
    </p>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}

function FillButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex min-w-[180px] items-center justify-center gap-3 rounded border-none px-8 py-4 text-base font-semibold transition-all ${
        disabled
          ? 'cursor-not-allowed bg-hairline text-muted'
          : 'cursor-pointer bg-accent text-accent-on enabled:hover:-translate-y-0.5 enabled:hover:opacity-90'
      }`}
    >
      {children}
    </button>
  );
}

function ActionIcon({ busy, name }: { busy: boolean; name: string }) {
  if (busy) return <UIcon name="spinner" className="animate-spin text-lg" />;
  return <UIcon name={name} className="text-lg" />;
}

function SentToast() {
  return (
    <span className="agreement-sent-toast absolute right-[-80px] top-1/2 -translate-y-1/2 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-on">
      Sent!
    </span>
  );
}

