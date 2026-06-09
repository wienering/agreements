'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useState, useEffect } from 'react';
import { adminTheme } from '../lib/adminTheme';
import { UIcon } from '../components/UIcon';
import { AdminButton } from '../components/AdminButton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileHeaderPressed, setIsMobileHeaderPressed] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', iconName: 'chart-line-up', href: '/admin', tooltip: 'Dashboard overview and statistics' },
    { id: 'clients', label: 'Clients', iconName: 'users', href: '/admin/clients', tooltip: 'Manage client information' },
    { id: 'import-events', label: 'Import Events', iconName: 'file-import', href: '/admin/events/import', tooltip: 'Import events from Bookly CSV export' },
    { id: 'templates', label: 'Templates', iconName: 'document', href: '/admin/templates', tooltip: 'Create and edit agreement templates' },
    { id: 'quotes', label: 'Quotes', iconName: 'dollar', href: '/admin/quotes', tooltip: 'Generate quotes for potential clients' },
    { id: 'leads', label: 'Leads', iconName: 'target', href: '/admin/leads', tooltip: 'Lead pipeline and follow-up tracking' },
    { id: 'agreements', label: 'Agreements', iconName: 'file-signature', href: '/admin/agreements', tooltip: 'Manage client agreements' },
    { id: 'backdrop-links', label: 'Backdrop Links', iconName: 'picture', href: '/admin/backdrop-links', tooltip: 'Manage backdrop selection URLs for the client portal' },
    { id: 'attendant-groups', label: 'Attendant Hubs', iconName: 'users-alt', href: '/admin/attendant-groups', tooltip: 'Manage groups of attendants and their hub links' },
  ];

  // Show loading state
  if (status === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: isDark ? '#080c08' : '#f8fafc',
        color: isDark ? adminTheme.dark.text : '#0f172a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <UIcon name="spinner" className="animate-spin text-2xl text-[#8f9a8f]" style={{ marginBottom: '16px', display: 'inline-flex' }} />
          <p style={{ fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page without sidebar
  if (status === 'unauthenticated') {
    return <>{children}</>;
  }

  const sidebarBg = isDark ? adminTheme.dark.sidebar : '#1e293b';
  const mainBg = isDark ? adminTheme.dark.bg : adminTheme.light.bg;
  const textColor = isDark ? adminTheme.dark.text : '#0f172a';
  const cardBg = isDark ? adminTheme.dark.card : '#ffffff';
  const borderColor = isDark ? adminTheme.dark.border : '#e2e8f0';
  const navActiveBg = 'rgba(var(--accent-rgb), 0.14)';
  const navHoverBg = adminTheme.dark.surfaceHover;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: mainBg }}>
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{ 
        width: isMobile ? '280px' : '250px', 
        backgroundColor: sidebarBg, 
        color: 'white', 
        padding: '24px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 999,
        transform: isMobile ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(var(--accent-rgb), 0.14)', 
              borderRadius: '8px',
              border: `1px solid ${adminTheme.dark.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: adminTheme.dark.accent
            }}>
              PG
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: adminTheme.dark.accent }}>Photobooth Guys</h1>
              <p style={{ margin: 0, color: adminTheme.dark.muted, fontSize: '12px' }}>Agreements Admin</p>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.tooltip}
                onClick={() => {
                  if (isMobile) {
                    setIsMobileMenuOpen(false);
                  }
                }}
                style={{
                  display: 'flex',
                  padding: '12px 24px',
                  backgroundColor: isActive ? navActiveBg : 'transparent',
                  color: isActive ? adminTheme.dark.accent : 'rgba(255, 255, 255, 0.88)',
                  textDecoration: 'none',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '16px',
                  transition: 'background-color 0.2s, color 0.2s',
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = navHoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <UIcon name={item.iconName} style={{ fontSize: '20px', width: '1.25em', flexShrink: 0 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ 
          padding: '16px 24px 32px 24px', 
          marginTop: 'auto',
          flexShrink: 0,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Dark Mode Toggle */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={toggleDarkMode}
              style={{
                width: '100%',
                padding: '10px 20px',
                backgroundColor: navHoverBg,
                color: 'rgba(255, 255, 255, 0.92)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
              }}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = adminTheme.dark.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = navHoverBg;
              }}
            >
              <UIcon name={isDark ? 'sun' : 'moon'} style={{ fontSize: '16px' }} />
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          {/* Logout Button */}
          <div>
            <AdminButton
              variant="danger"
              fullWidth
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              title="Sign out of admin dashboard"
            >
              <UIcon name="sign-out" style={{ fontSize: '16px' }} />
              Logout
            </AdminButton>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.35 }}>
            <a
              href="https://www.flaticon.com/uicons"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              UIcons by Flaticon
            </a>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        backgroundColor: mainBg,
        marginLeft: isMobile ? '0' : '250px',
        width: isMobile ? '100%' : 'auto'
      }}>
        {/* Mobile Header */}
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            position: 'sticky',
            top: 0,
            zIndex: 997,
          }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              onPointerDown={() => setIsMobileHeaderPressed(true)}
              onPointerUp={() => setIsMobileHeaderPressed(false)}
              onPointerLeave={() => setIsMobileHeaderPressed(false)}
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                backgroundColor: 'transparent',
                border: 'none',
                color: textColor,
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isMobileHeaderPressed ? 0.7 : 1,
                transition: 'opacity 0.15s ease',
              }}
              title="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <Link
                href="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'rgba(var(--accent-rgb), 0.14)',
                  borderRadius: '6px',
                  border: `1px solid ${adminTheme.dark.accent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: adminTheme.dark.accent,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}>
                  PG
                </div>
                <span style={{ fontSize: '16px', fontWeight: '600', color: adminTheme.dark.accent }}>
                  Photobooth Guys
                </span>
              </Link>
            </div>
            <div style={{ width: '48px', minWidth: '48px' }} />
          </div>
        )}
        <div className="admin-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}