'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import type { AgreementRecord } from './types';

export function useAgreementDelivery(token: string, agreement: AgreementRecord | null, admin: boolean) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailSentToast, setShowEmailSentToast] = useState(false);

  const request = admin ? adminFetch : fetch;

  const handleDownloadPDF = useCallback(async () => {
    if (!agreement) return;

    setIsDownloading(true);
    try {
      const response = await request('/api/agreements/pdf', {
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
        const isTextFile = admin && response.headers.get('content-type')?.includes('text/plain');
        const extension = isTextFile ? 'txt' : 'pdf';
        a.download = `agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (isTextFile) {
          alert('PDF generation is temporarily unavailable. A text version has been downloaded instead.');
        } else {
          alert('PDF downloaded successfully!');
        }
      } else {
        alert('Failed to download agreement. Please try again later.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading agreement. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  }, [agreement, admin, request, token]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#download' && agreement) {
        handleDownloadPDF();
      }
    };

    if (window.location.hash === '#download' && agreement) {
      handleDownloadPDF();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [agreement, handleDownloadPDF]);

  const handleEmailAgreement = () => {
    if (!agreement) return;
    setEmailAddress(agreement.client.email);
    setShowEmailModal(true);
    setEmailError(null);
  };

  const handleCloseEmail = () => {
    setShowEmailModal(false);
    setEmailAddress('');
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
      const response = await request('/api/agreements/email', {
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
        setShowEmailSentToast(true);
        setTimeout(() => setShowEmailSentToast(false), 3000);
      } else {
        const errorData = await response.json();
        setEmailError(errorData.error || 'Failed to send email');
      }
    } catch {
      setEmailError('Error sending email');
    } finally {
      setIsEmailing(false);
    }
  };

  return {
    isDownloading,
    isEmailing,
    showEmailModal,
    emailAddress,
    setEmailAddress,
    emailError,
    showEmailSentToast,
    handleDownloadPDF,
    handleEmailAgreement,
    handleCloseEmail,
    handleSendEmail,
  };
}
