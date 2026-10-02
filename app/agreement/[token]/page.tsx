'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { devLog } from '@/lib/logger';
import { AgreementMotionStyles } from '@/app/components/agreement/AgreementMotion';
import { AgreementStatusScreen } from '@/app/components/agreement/AgreementStatusScreen';
import {
  AgreementDocument,
  UnverifiedAgreementHeader,
} from '@/app/components/agreement/AgreementDocument';
import { EmailVerification } from '@/app/components/agreement/EmailVerification';
import { processSmartFields } from '@/app/components/agreement/processSmartFields';
import { SignSuccessOverlay } from '@/app/components/agreement/SignSuccessOverlay';
import { SigningModal } from '@/app/components/agreement/SigningModal';
import { viewerHasSigned, type AgreementRecord, type VerifiedContact } from '@/app/components/agreement/types';
import { useAgreementDelivery } from '@/app/components/agreement/useAgreementDelivery';

export default function ClientAgreementPage() {
  const params = useParams();
  const token = params.token as string;
  const hasFetchedData = useRef(false);
  const signButtonRef = useRef<HTMLButtonElement>(null);

  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [verifiedContact, setVerifiedContact] = useState<VerifiedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [signError, setSignError] = useState<string | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [signSuccessMessage, setSignSuccessMessage] = useState('');

  const delivery = useAgreementDelivery(token, isEmailVerified ? agreement : null, false);

  const handleEmailVerification = async () => {
    if (!verificationEmail.trim()) {
      setVerificationError('Please enter your email address');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch('/api/agreements/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email: verificationEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsEmailVerified(true);
        setShowEmailVerification(false);

        if (data.verifiedContact) {
          setVerifiedContact(data.verifiedContact);
        }

        // View tracking and the "Agreement Viewed" email happen in verify-email.
        const loaded = data.agreement as AgreementRecord;
        setAgreement({
          ...loaded,
          template: {
            ...loaded.template,
            htmlContent: processSmartFields(
              loaded.template.htmlContent,
              loaded.client,
              loaded.id,
              loaded.event ?? null,
              loaded,
            ),
          },
        });
      } else {
        setVerificationError(data.error || 'Email verification failed');
      }
    } catch {
      setVerificationError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/client?token=${token}`);

      if (response.ok) {
        setLoading(false);
        setShowEmailVerification(true);
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
        setLoading(false);
      } else {
        setError('Failed to load agreement.');
        setLoading(false);
      }
    } catch {
      setError('Error loading agreement.');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hasFetchedData.current) return;
    if (token) {
      hasFetchedData.current = true;
      fetchAgreement();
    }
  }, [token, fetchAgreement]);

  useEffect(() => {
    if (agreement) {
      document.title = `${agreement.template.title} - ${agreement.client.firstName} ${agreement.client.lastName} | Photobooth Guys`;
    } else {
      document.title = 'Agreement - Loading...';
    }
  }, [agreement]);

  const handleSignAgreement = () => {
    if (!agreement) return;

    if (verifiedContact) {
      setClientName(`${verifiedContact.firstName || ''} ${verifiedContact.lastName || ''}`.trim());
      setClientEmail(verifiedContact.email);
    } else {
      setClientName(`${agreement.client.firstName} ${agreement.client.lastName}`);
      setClientEmail(agreement.client.email);
    }
    setShowSignModal(true);
    setSignError(null);
  };

  const handleCancelSign = () => {
    setShowSignModal(false);
    setClientName('');
    setClientEmail('');
    setSignError(null);
    setHasAgreedToTerms(false);
    setTimeout(() => {
      signButtonRef.current?.focus();
    }, 100);
  };

  const handleConfirmSign = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      setSignError('Please fill in all fields');
      return;
    }

    setIsSigning(true);
    setSignError(null);

    try {
      const response = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const signerEmail = clientEmail.trim();
        const signed = data.agreement as AgreementRecord;
        setShowSignModal(false);
        setClientName('');
        setClientEmail('');
        setAgreement({
          ...signed,
          template: {
            ...signed.template,
            htmlContent: processSmartFields(
              signed.template.htmlContent,
              signed.client,
              signed.id,
              signed.event ?? null,
              signed,
            ),
          },
        });

        if (data.isFinalSignature === false) {
          setSignSuccessMessage('Signature recorded. Waiting for the other signer to complete the agreement.');
          setShowSignSuccess(true);
          setTimeout(() => {
            setShowSignSuccess(false);
          }, 3500);
        } else {
          setSignSuccessMessage('Agreement signed successfully. A copy has been emailed to you.');
          setShowSignSuccess(true);
          setTimeout(() => {
            setShowSignSuccess(false);
            try {
              sessionStorage.setItem(`agreement-signer-email-${token}`, signerEmail);
            } catch {
              // sessionStorage unavailable — thank-you page will prompt for email
            }
            window.location.href = `/agreement/${token}/thank-you`;
          }, 3000);
        }
      } else {
        const errorData = await response.json();
        setSignError(errorData.error || 'Failed to sign agreement');
      }
    } catch {
      setSignError('Error signing agreement');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading && !showEmailVerification) {
    devLog('🔄 Showing loading screen - loading:', loading, 'showEmailVerification:', showEmailVerification);
    return (
      <AgreementStatusScreen
        kind="loading"
        title="Loading Agreement"
        message="Please wait while we load your agreement..."
      />
    );
  }

  if (error) {
    return (
      <AgreementStatusScreen
        kind="error"
        title="Agreement Not Found"
        message={error || 'Failed to load agreement'}
        support="client"
        displayTitle
      />
    );
  }

  const alreadySigned = viewerHasSigned(verifiedContact?.email, agreement?.signatures);

  return (
    <>
      <AgreementMotionStyles />
      <div className="min-h-screen bg-paper font-ui">
        {showSignSuccess && <SignSuccessOverlay message={signSuccessMessage} />}
        {showEmailVerification && (
          <EmailVerification
            email={verificationEmail}
            onEmailChange={setVerificationEmail}
            error={verificationError}
            isVerifying={isVerifying}
            onCancel={() => {
              setShowEmailVerification(false);
              setVerificationEmail('');
              setVerificationError(null);
            }}
            onVerify={handleEmailVerification}
          />
        )}
        {!isEmailVerified && <UnverifiedAgreementHeader />}
        {isEmailVerified && agreement && (
          <AgreementDocument
            mode="sign"
            agreement={agreement}
            delivery={delivery}
            isSigning={isSigning}
            alreadySigned={alreadySigned}
            onSign={handleSignAgreement}
            signButtonRef={signButtonRef}
          />
        )}
        {showSignModal && (
          <SigningModal
            clientName={clientName}
            clientEmail={clientEmail}
            onNameChange={setClientName}
            onEmailChange={setClientEmail}
            signError={signError}
            hasAgreedToTerms={hasAgreedToTerms}
            onAgreedChange={setHasAgreedToTerms}
            isSigning={isSigning}
            onCancel={handleCancelSign}
            onConfirm={handleConfirmSign}
          />
        )}
      </div>
    </>
  );
}
