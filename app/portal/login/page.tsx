'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface VerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  sessionToken: string;
  expiresAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    address: string | null;
    phoneAddedAt: string | null;
    addressAddedAt: string | null;
    agreementCount: number;
  };
}

function PortalLoginContent() {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [magicLinkProcessing, setMagicLinkProcessing] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Set page title and handle magic link token
  useEffect(() => {
    document.title = 'Client Portal Login | Photobooth Guys';
    
    // Check for magic link token in URL
    const token = searchParams.get('token');
    if (token && !magicLinkProcessing) {
      handleMagicLogin(token);
    }
  }, [searchParams]);

  const handleMagicLogin = async (token: string) => {
    setMagicLinkProcessing(true);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/agreements/portal/magic-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store session token
        localStorage.setItem('portal_session_token', data.sessionToken);
        
        // Redirect to dashboard
        router.push('/portal/dashboard');
      } else {
        // Magic link failed - show error and allow manual login
        setError(data.error || 'Magic link expired or invalid. Please log in manually.');
        setMagicLinkProcessing(false);
        setLoading(false);
        
        // Remove token from URL without refreshing
        window.history.replaceState({}, '', '/portal/login');
      }
    } catch (error) {
      setError('Network error. Please try logging in manually.');
      setMagicLinkProcessing(false);
      setLoading(false);
      window.history.replaceState({}, '', '/portal/login');
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/agreements/portal/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verification code sent to your email!');
        setStep('verify');
      } else if (response.status === 429) {
        setError(data.error || 'Too many attempts. Please try again in a few minutes.');
      } else {
        setError('Failed to send verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/agreements/portal/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data: VerifyResponse = await response.json();

      if (response.ok) {
        // Store session token
        localStorage.setItem('portal_session_token', data.sessionToken);
        
        // Redirect to dashboard
        router.push('/portal/dashboard');
      } else if (response.status === 429) {
        setError(data.error || 'Too many attempts. Please try again in a few minutes.');
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while processing magic link
  if (magicLinkProcessing) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <p className="text-base font-semibold text-ink">Photobooth Guys</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Client Portal</p>
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-ink">
            Logging you in...
          </h2>
          <p className="text-muted">
            Please wait while we verify your access.
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="client-page-title text-3xl text-ink">
            Client Portal Access
          </h2>
          <div className="client-title-rule mx-auto" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">
            Enter your email to receive a verification code
          </p>
        </div>

        <div className="bg-panel py-8 px-4 rounded-lg sm:px-10 border border-hairline">
          {step === 'email' ? (
            <form className="space-y-6" onSubmit={handleRequestCode}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-md placeholder:text-muted bg-panel text-ink focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-panel p-4">
                  <div className="text-sm text-alert">{error}</div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-panel border border-success p-4">
                  <div className="text-sm font-medium text-success">{success}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-accent-on bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-panel disabled:text-muted disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-ink">
                  Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-hairline rounded-md placeholder:text-muted bg-panel text-ink focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-center text-lg tracking-widest"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">
                  Check your email for the verification code
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-panel p-4">
                  <div className="text-sm text-alert">{error}</div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setVerificationCode('');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 py-2 px-4 border border-hairline rounded-md text-sm font-medium text-ink bg-panel hover:bg-paper focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !verificationCode.trim()}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-accent-on bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-panel disabled:text-muted disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted">
            Having trouble? Contact us for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading component for magic link processing
function MagicLinkLoading() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <p className="text-base font-semibold text-ink">Photobooth Guys</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Client Portal</p>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-ink">
          Logging you in...
        </h2>
        <p className="text-muted">
          Please wait while we verify your access.
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function PortalLogin() {
  return (
    <Suspense fallback={<MagicLinkLoading />}>
      <PortalLoginContent />
    </Suspense>
  );
}
