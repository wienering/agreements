'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UIcon } from '../../../components/UIcon';
import { formatDateTimeToronto, formatDateToronto } from '@/lib/dates';

interface AgreementData {
  id: string;
  client: {
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
    packagePrice: number | null;
    notes: string | null;
  };
  event?: {
    eventDate?: string | null;
    eventType?: string | null;
    eventLocation?: string | null;
    eventPackage?: string | null;
    packagePrice?: number | string | null;
  } | null;
  template: {
    title: string;
    htmlContent: string;
  };
  status: string;
  signedAt: string | null;
  signedFromIP: string | null;
  mergedHtml: string | null;
  fields: Array<{
    key: string;
    value: string;
  }>;
}

const actionButtonClass = (busy: boolean) =>
  `flex min-w-[180px] items-center justify-center gap-3 rounded-sm border-none px-8 py-4 text-base font-semibold transition-all duration-200 ease ${
    busy
      ? 'cursor-not-allowed bg-hairline text-muted'
      : 'cursor-pointer bg-accent text-white hover:-translate-y-0.5 hover:opacity-90'
  }`;

const nextStepLinkClass =
  'inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 ease hover:-translate-y-px hover:opacity-90';

const summaryLabelClass = 'm-0 mb-2 text-sm font-semibold uppercase tracking-[0.5px] text-muted';

export default function ThankYouPage() {
  const params = useParams();
  const token = params.token as string;

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Thank You | Agreement Signed | Photobooth Guys';
  }, []);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem(`agreement-signer-email-${token}`);
    if (storedEmail) {
      loadAgreement(storedEmail);
    } else {
      setNeedsEmail(true);
      setLoading(false);
    }
  }, [token]);

  const loadAgreement = async (email: string) => {
    setLoading(true);
    setError(null);
    setNeedsEmail(false);

    try {
      const response = await fetch('/api/agreements/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAgreement(data.agreement);
        try {
          sessionStorage.setItem(`agreement-signer-email-${token}`, email.trim());
        } catch {
          // ignore
        }
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
      } else {
        setError(data.error || 'Failed to load agreement.');
        setNeedsEmail(true);
      }
    } catch {
      setError('Error loading agreement.');
      setNeedsEmail(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!verificationEmail.trim()) return;
    setIsVerifying(true);
    await loadAgreement(verificationEmail);
    setIsVerifying(false);
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;

    setIsDownloading(true);
    try {
      const response = await fetch('/api/agreements/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const isTextFile = response.headers.get('content-type')?.includes('text/plain');
        const extension = isTextFile ? 'txt' : 'pdf';
        a.download = `agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download agreement. Please try again later.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading agreement. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailAgreement = () => {
    if (!agreement) return;

    setEmailAddress(agreement.client.email);
    setShowEmailModal(true);
    setEmailError(null);
  };

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      setEmailError('Please enter an email address');
      return;
    }

    setIsEmailing(true);
    setEmailError(null);

    try {
      const response = await fetch('/api/agreements/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          recipientEmail: emailAddress.trim(),
        }),
      });

      if (response.ok) {
        setShowEmailModal(false);
        setEmailAddress('');
        alert('Email sent successfully!');
      } else {
        const errorData = await response.json();
        setEmailError(errorData.error || 'Failed to send email');
      }
    } catch (err) {
      setEmailError('Error sending email');
    } finally {
      setIsEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper font-ui">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-hairline border-t-accent" />
        <p className="text-base text-muted">Loading your agreement...</p>
      </div>
    );
  }

  if (needsEmail && !agreement) {
    const cannotContinue = isVerifying || !verificationEmail.trim();

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 font-ui">
        <div className="w-full max-w-[420px] rounded-sm border border-hairline bg-panel p-10">
          <h1 className="m-0 font-display text-2xl font-bold text-ink">Confirm Your Email</h1>
          <div className="mb-4 mt-3 h-px w-full bg-rule-strong" aria-hidden="true" />
          <p className="m-0 mb-6 text-base leading-normal text-muted">
            Enter the email address you used to sign this agreement to view your confirmation page.
          </p>
          {error && (
            <div className="mb-4 rounded-sm border border-alert bg-panel p-3 text-sm text-alert">{error}</div>
          )}
          <label className="mb-2 block text-sm font-medium text-ink">Email Address</label>
          <input
            type="email"
            value={verificationEmail}
            onChange={(e) => setVerificationEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEmailSubmit();
            }}
            className="mb-5 box-border w-full rounded-sm border border-hairline bg-white p-3 text-sm text-ink"
            placeholder="you@example.com"
          />
          <button
            onClick={handleEmailSubmit}
            disabled={cannotContinue}
            className={`w-full rounded-sm border-none px-6 py-3 text-sm font-semibold ${
              cannotContinue ? 'cursor-not-allowed bg-hairline text-muted' : 'cursor-pointer bg-accent text-white'
            } ${isVerifying ? 'opacity-70' : ''}`}
          >
            {isVerifying ? 'Loading...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper font-ui">
        <div className="max-w-[500px] rounded-sm border border-hairline bg-panel p-10 text-center">
          <div className="mb-4 flex justify-center text-warn">
            <UIcon name="circle-exclamation" className="text-[48px]" title="Warning" />
          </div>
          <h1 className="m-0 mb-4 font-display text-2xl font-bold text-ink">Agreement Not Found</h1>
          <p className="m-0 text-base text-muted">{error || 'Failed to load agreement'}</p>
        </div>
      </div>
    );
  }

  const packagePrice = agreement.event?.packagePrice ?? agreement.client.packagePrice;
  const packagePriceLabel =
    typeof packagePrice === 'number' ? Number(packagePrice).toFixed(2) : String(packagePrice);

  return (
    <>
      <style>{`
        @keyframes thank-you-fade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes thank-you-slide {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes thank-you-check {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="min-h-screen bg-paper font-ui">
        <div className="animate-[thank-you-fade_0.6s_ease-out] border-b border-hairline bg-panel py-10 text-center">
          <div className="mx-auto max-w-[800px] px-6">
            <div className="animate-[thank-you-check_1s_ease-in-out] mx-auto mb-8 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-success text-[48px] text-white">
              <UIcon name="check" className="text-[48px] text-white" title="Success" />
            </div>

            <h1 className="m-0 animate-[thank-you-slide_0.8s_ease-out] font-display text-5xl font-extrabold text-ink">
              Thank You!
            </h1>
            <div className="mx-auto mb-4 mt-3 h-px w-full bg-rule-strong" aria-hidden="true" />
            <p className="m-0 mb-6 text-xl leading-[1.6] text-muted">
              Your agreement has been successfully signed and is now binding.
            </p>

            <div className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-paper px-6 py-3 text-base font-semibold text-ink">
              <UIcon name="envelope" className="shrink-0" />
              A copy has been emailed to {agreement.client.email}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <div className="mb-8 animate-[thank-you-fade_0.8s_ease-out_0.2s_both] rounded-sm border border-hairline bg-panel p-8">
            <h2 className="m-0 mb-6 text-2xl font-bold text-ink">Agreement Summary</h2>

            <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
              <div>
                <h3 className={summaryLabelClass}>Client Information</h3>
                <p className="m-0 mb-1 text-base font-medium text-ink">
                  {agreement.client.firstName} {agreement.client.lastName}
                </p>
                <p className="m-0 text-sm text-muted">{agreement.client.email}</p>
              </div>

              <div>
                <h3 className={summaryLabelClass}>Event Details</h3>
                <p className="m-0 mb-1 text-base font-medium text-ink">
                  {(agreement.event?.eventType ?? agreement.client.eventType) || 'Not specified'}
                </p>
                {(agreement.event?.eventDate ?? agreement.client.eventDate) && (
                  <p className="m-0 mb-1 text-sm text-muted">
                    {formatDateToronto(agreement.event?.eventDate ?? agreement.client.eventDate!)}
                  </p>
                )}
                <p className="m-0 text-sm text-muted">
                  {(agreement.event?.eventLocation ?? agreement.client.eventLocation) || 'Location TBD'}
                </p>
              </div>

              <div>
                <h3 className={summaryLabelClass}>Package</h3>
                <p className="m-0 mb-1 text-base font-medium text-ink">
                  {(agreement.event?.eventPackage ?? agreement.client.eventPackage) || 'Standard Package'}
                </p>
                {packagePrice && (
                  <p className="m-0 text-sm text-muted">${packagePriceLabel}</p>
                )}
              </div>

              <div>
                <h3 className={summaryLabelClass}>Signed On</h3>
                <p className="m-0 text-base font-medium text-ink">
                  {agreement.signedAt
                    ? formatDateTimeToronto(agreement.signedAt, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-10 flex flex-wrap justify-center gap-5 animate-[thank-you-fade_1s_ease-out_0.4s_both]">
            <button onClick={handleDownloadPDF} disabled={isDownloading} className={actionButtonClass(isDownloading)}>
              {isDownloading ? (
                <UIcon name="spinner" className="animate-spin text-lg" />
              ) : (
                <UIcon name="file-pdf" className="text-lg" />
              )}{' '}
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>

            <button onClick={handleEmailAgreement} disabled={isEmailing} className={actionButtonClass(isEmailing)}>
              {isEmailing ? (
                <UIcon name="spinner" className="animate-spin text-lg" />
              ) : (
                <UIcon name="envelope" className="text-lg" />
              )}{' '}
              {isEmailing ? 'Sending...' : 'Email Copy'}
            </button>
          </div>

          <div className="mb-8 animate-[thank-you-fade_1.2s_ease-out_0.6s_both] rounded-sm border border-hairline bg-panel p-8">
            <h2 className="m-0 mb-6 text-2xl font-bold text-ink">What&apos;s Next?</h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
              <div className="rounded-sm border border-hairline bg-paper p-5">
                <h3 className="m-0 mb-3 text-lg font-semibold text-ink">
                  <span className="inline-flex items-center gap-2">
                    <UIcon name="link" />
                    Access Your Client Portal
                  </span>
                </h3>
                <p className="m-0 mb-4 text-sm leading-normal text-muted">
                  View all your agreements, track payment status, access your event gallery, and manage your event
                  details in one convenient place.
                </p>
                <a href="/portal/login" target="_blank" rel="noopener noreferrer" className={nextStepLinkClass}>
                  Open Client Portal →
                </a>
              </div>

              <div className="rounded-sm border border-hairline bg-paper p-5">
                <h3 className="m-0 mb-3 text-lg font-semibold text-ink">
                  <span className="inline-flex items-center gap-2">
                    <UIcon name="camera" />
                    Choose Your Print Template
                  </span>
                </h3>
                <p className="m-0 mb-4 text-sm leading-normal text-muted">
                  Select from our collection of professional photo booth templates to match your event theme.
                </p>
                <a
                  href="https://photoboothguys.ca/photo-booth-templates-chooser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={nextStepLinkClass}
                >
                  Browse Templates →
                </a>
              </div>

              <div className="rounded-sm border border-hairline bg-paper p-5">
                <h3 className="m-0 mb-3 text-lg font-semibold text-ink">
                  <span className="inline-flex items-center gap-2">
                    <UIcon name="phone-call" />
                    Contact Us
                  </span>
                </h3>
                <p className="m-0 mb-4 text-sm leading-normal text-muted">
                  Have questions about your event? Our team is here to help make your day perfect.
                </p>
                <div className="flex flex-col gap-2 text-sm text-ink">
                  <div className="flex items-center gap-2">
                    <UIcon name="envelope" className="shrink-0 opacity-[0.85]" />
                    info@photoboothguys.ca
                  </div>
                  <div className="flex items-center gap-2">
                    <UIcon name="phone-call" className="shrink-0 opacity-[0.85]" />
                    647-378-5332
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showEmailModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
            <div className="w-[90%] max-w-[400px] rounded-sm border border-hairline bg-panel p-8">
              <h2 className="m-0 mb-6 text-xl text-ink">Email Agreement Copy</h2>
              <p className="m-0 mb-6 text-sm text-muted">
                Enter the email address where you&apos;d like to receive a copy of the signed agreement.
              </p>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-ink">Recipient Email</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full rounded-sm border border-hairline bg-panel p-3 text-sm text-ink"
                  placeholder="Enter recipient email"
                />
              </div>
              {emailError && (
                <div className="mb-4 rounded-sm border border-alert bg-panel p-3 text-sm text-alert">{emailError}</div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setEmailError(null);
                  }}
                  className="cursor-pointer rounded-sm border border-hairline bg-transparent px-6 py-3 text-sm text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isEmailing}
                  className={`rounded-sm border-none bg-accent px-6 py-3 text-sm text-white ${
                    isEmailing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  }`}
                >
                  {isEmailing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
