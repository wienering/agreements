/* eslint-disable react/no-unescaped-entities */
'use client';
import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UIcon } from '../../components/UIcon';

export default function AdminLogin() {
  const [email, setEmail] = useState('agreements@photoboothguys.ca');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [environment, setEnvironment] = useState('Production');
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    document.title = 'Admin Login | Photobooth Guys';
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setEnvironment('Development');
    } else if (hostname.includes('staging') || hostname.includes('dev')) {
      setEnvironment('Staging');
    } else {
      setEnvironment('Production');
    }
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('email', { email });
      setShowSuccessToast(true);
      setCanResend(false);
      setResendCountdown(30);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      await signIn('email', { email });
      setShowSuccessToast(true);
      setCanResend(false);
      setResendCountdown(30);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const envPillClass =
    environment === 'Production'
      ? 'bg-admin-surface-raised text-success border border-admin-border'
      : environment === 'Staging'
        ? 'bg-admin-surface-raised text-warn border border-admin-border'
        : 'bg-admin-surface-raised text-alert border border-admin-border';

  const envDotClass =
    environment === 'Production'
      ? 'bg-success'
      : environment === 'Staging'
        ? 'bg-warn'
        : 'bg-alert';

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-admin-bg flex items-center justify-center text-admin-text">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent mx-auto mb-4" />
          <p className="text-admin-muted">Loading...</p>
        </div>
      </main>
    );
  }

  if (status === 'authenticated') {
    return (
      <main className="min-h-screen bg-admin-bg flex items-center justify-center text-admin-text">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent mx-auto mb-4" />
          <p className="text-admin-muted">Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-admin-bg text-admin-text">
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="rounded-lg border border-admin-border bg-admin-surface p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <UIcon name="check" className="text-success text-lg" />
              <div>
                <p className="text-sm font-medium text-admin-text">Magic link sent securely!</p>
                <p className="text-xs text-admin-muted">Check your email for the login link</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-4 left-4 z-40">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${envPillClass}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${envDotClass}`} />
          {environment} Ready
        </div>
      </div>

      <header className="sticky top-0 z-10 border-b border-admin-border bg-admin-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold font-bold text-[#2A2724]">
              PG
            </div>
            <div className="leading-tight">
              <p className="text-sm text-admin-muted">Photobooth Guys</p>
              <p className="text-base font-semibold text-gold">Agreements</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-[#2A2724] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-admin-bg"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-admin-border bg-admin-surface p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
                <UIcon name="lock" className="text-2xl text-gold" />
              </div>
              <h1 className="admin-page-title text-2xl font-bold text-admin-text">Admin Login</h1>
              <div className="admin-title-rule mx-auto" aria-hidden="true" />
              <p className="mt-3 text-sm text-admin-muted">
                We&apos;ll send a magic link to your email address
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSignIn(); }} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-admin-text mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@photoboothguys.ca"
                  className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-3 text-sm text-admin-text placeholder-admin-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-gold px-4 py-3 text-sm font-semibold text-[#2A2724] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-admin-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2A2724] border-t-transparent mr-2" />
                    Sending Magic Link...
                  </div>
                ) : (
                  'Send Magic Link'
                )}
              </button>

              {!canResend && resendCountdown > 0 && (
                <div className="text-center">
                  <p className="text-sm text-admin-muted">
                    Resend available in {resendCountdown}s
                  </p>
                </div>
              )}

              {canResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="w-full rounded-md border border-admin-border bg-transparent px-4 py-2 text-sm font-medium text-admin-text hover:bg-admin-surface-raised focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-admin-surface disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-admin-muted border-t-transparent mr-2" />
                      Resending...
                    </div>
                  ) : (
                    'Resend Magic Link'
                  )}
                </button>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-admin-muted">
                Check your email for the magic link to access the admin dashboard
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-admin-border bg-admin-surface p-4 text-center">
              <div className="mb-2 flex justify-center text-admin-muted">
                <UIcon name="lock" className="text-2xl" />
              </div>
              <h3 className="text-sm font-semibold text-admin-text">Secure Access</h3>
              <p className="text-xs text-admin-muted">Passwordless authentication</p>
            </div>
            <div className="rounded-lg border border-admin-border bg-admin-surface p-4 text-center">
              <div className="mb-2 flex justify-center text-admin-muted">
                <UIcon name="bolt" className="text-2xl" />
              </div>
              <h3 className="text-sm font-semibold text-admin-text">Quick Login</h3>
              <p className="text-xs text-admin-muted">No passwords to remember</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-admin-border bg-admin-surface py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-admin-muted">
          <span>© {new Date().getFullYear()} Photobooth Guys • Agreements</span>
          <Link href="/" className="hover:text-gold">Back to Home</Link>
        </div>
      </footer>
    </main>
  );
}
