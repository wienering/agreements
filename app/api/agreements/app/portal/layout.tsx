'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // Check if user is logged in and get session info
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('portal_session_token');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const response = await fetch('/api/agreements/portal/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          
          // Calculate time left
          const expiresAt = new Date(data.session.expiresAt);
          const now = new Date();
          const timeLeft = Math.max(0, expiresAt.getTime() - now.getTime());
          setSessionTimeLeft(timeLeft);
        } else {
          // Session expired or invalid
          localStorage.removeItem('portal_session_token');
          setIsLoggedIn(false);
          router.push('/portal/login');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem('portal_session_token');
        setIsLoggedIn(false);
        router.push('/portal/login');
      }
    };

    checkSession();

    // Update session timer every minute
    const timer = setInterval(() => {
      if (sessionTimeLeft !== null) {
        const newTimeLeft = Math.max(0, sessionTimeLeft - 60000); // Subtract 1 minute
        setSessionTimeLeft(newTimeLeft);
        
        if (newTimeLeft === 0) {
          // Session expired
          localStorage.removeItem('portal_session_token');
          setIsLoggedIn(false);
          router.push('/portal/login');
        }
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [sessionTimeLeft, router]);

  // Format time left for display
  const formatTimeLeft = (timeLeft: number) => {
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle logout
  const handleLogout = async () => {
    const token = localStorage.getItem('portal_session_token');
    if (token) {
      try {
        await fetch('/api/agreements/portal/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    
    localStorage.removeItem('portal_session_token');
    setIsLoggedIn(false);
    router.push('/portal/login');
  };

  // Don't show layout for login page
  if (typeof window !== 'undefined' && window.location.pathname === '/portal/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-emerald-200/70 bg-white/70 backdrop-blur dark:border-emerald-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500 text-white font-bold">
              PG
            </div>
            <div className="leading-tight">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Photobooth Guys</p>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Client Portal</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Session Timer */}
            {isLoggedIn && sessionTimeLeft !== null && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  <span className="text-slate-600 dark:text-slate-300">
                    Session: {formatTimeLeft(sessionTimeLeft)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            {isLoggedIn && (
              <nav className="flex items-center gap-4">
                <Link
                  href="/portal/dashboard"
                  className="text-sm font-medium text-slate-700 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-offset-slate-900"
                >
                  Logout
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-200 bg-white py-6 dark:border-emerald-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-slate-500 dark:text-slate-400">
          <span>© {new Date().getFullYear()} Photobooth Guys • Client Portal</span>
          <div className="flex items-center gap-4">
            <span className="text-xs">Secure • Read-Only Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
