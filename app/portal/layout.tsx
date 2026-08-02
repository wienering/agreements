'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [clientFirstName, setClientFirstName] = useState<string | null>(null);
  const router = useRouter();

  // Update document title when clientFirstName changes, but only if title hasn't been set by page metadata
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Only set default title if current title is the root default or hasn't been customized
      const currentTitle = document.title;
      const isDefaultTitle = currentTitle === 'Agreements' || currentTitle === 'Client Portal' || currentTitle.startsWith('Client Portal -');
      
      // Only update if it's still the default title (not set by page metadata)
      if (isDefaultTitle) {
        if (clientFirstName) {
          document.title = `Client Portal - ${clientFirstName}`;
        } else {
          document.title = 'Client Portal';
        }
      }
    }
  }, [clientFirstName]);

  // Check if user is logged in and get session info
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const token = localStorage.getItem('portal_session_token');
      if (!token) {
        if (mounted) {
          setIsLoggedIn(false);
          setIsChecking(false);
          setClientFirstName(null);
        }
        return;
      }

      try {
        const response = await fetch('/api/agreements/portal/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (mounted) {
          if (response.ok) {
            const data = await response.json();
            setIsLoggedIn(true);
            setClientFirstName(data.client?.firstName || null);
          } else {
            // Session expired or invalid
            localStorage.removeItem('portal_session_token');
            setIsLoggedIn(false);
            setClientFirstName(null);
            // Only redirect if not already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/portal/login')) {
              router.push('/portal/login');
            }
          }
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (mounted) {
          // Only remove session if we get a network error (not on initial load)
          // This prevents logging out on double refresh
          if (error instanceof TypeError && error.message.includes('fetch')) {
            // Network error - keep session for now
            setIsLoggedIn(!!localStorage.getItem('portal_session_token'));
          } else {
            localStorage.removeItem('portal_session_token');
            setIsLoggedIn(false);
            setClientFirstName(null);
          }
          setIsChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

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

  // Don't show layout for login page or landing page
  if (typeof window !== 'undefined' && (window.location.pathname === '/portal/login' || window.location.pathname === '/portal')) {
    return <div data-surface="client" className="min-h-screen bg-paper">{children}</div>;
  }

  return (
    <div data-surface="client" className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Photobooth Guys</p>
              <p className="text-base font-semibold text-ink">
                Client Portal{clientFirstName ? ` — ${clientFirstName}` : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Session Status */}
            {isLoggedIn && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-accent"></div>
                  <span className="text-muted">
                    Session Active
                  </span>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            {isLoggedIn && (
              <nav className="flex items-center gap-4">
                <Link
                  href="/portal/dashboard"
                  className="text-sm font-medium text-ink hover:text-accent"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper"
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
      <footer className="border-t border-hairline bg-panel py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} Photobooth Guys • Client Portal</span>
          <div className="flex items-center gap-4">
            <span className="text-xs">Secure • Encrypted</span>
            {!isLoggedIn && (
              <Link href="/portal/login" className="text-xs font-medium text-accent underline-offset-2 hover:underline">
                Login
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
