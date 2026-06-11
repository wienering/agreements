'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { adminTheme } from '../lib/adminTheme';
import { UIcon } from '../components/UIcon';
import { AdminButton } from '../components/AdminButton';

const theme = adminTheme.dark;
const INK = '#2A2724';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileHeaderPressed, setIsMobileHeaderPressed] = useState(false);

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

  if (status === 'loading') {
    return (
      <div
        data-surface="admin"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <UIcon name="spinner" className="animate-spin text-2xl" style={{ marginBottom: '16px', display: 'inline-flex', color: 'var(--admin-muted)' }} />
          <p style={{ fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div data-surface="admin">{children}</div>;
  }

  const navActiveBg = 'rgba(var(--accent-rgb), 0.14)';
  const navHoverBg = theme.surfaceHover;

  return (
    <div data-surface="admin" style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.bg }}>
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

      <div style={{
        width: isMobile ? '280px' : '250px',
        backgroundColor: theme.sidebar,
        color: theme.text,
        padding: '24px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 999,
        transform: isMobile ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--gold)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: INK,
            }}>
              PG
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--gold)' }}>Photobooth Guys</h1>
              <p style={{ margin: 0, color: theme.muted, fontSize: '12px' }}>Agreements Admin</p>
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
                  color: isActive ? 'var(--gold)' : theme.text,
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

        <div style={{
          padding: '16px 24px 32px 24px',
          marginTop: 'auto',
          flexShrink: 0,
          borderTop: `1px solid ${theme.border}`,
        }}>
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
          <p style={{ margin: '12px 0 0', fontSize: '10px', color: theme.muted, lineHeight: 1.35 }}>
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

      <div style={{
        flex: 1,
        backgroundColor: theme.bg,
        marginLeft: isMobile ? '0' : '250px',
        width: isMobile ? '100%' : 'auto',
      }}>
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: theme.card,
            borderBottom: `1px solid ${theme.border}`,
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
                color: theme.text,
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
                  backgroundColor: 'var(--gold)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: INK,
                }}>
                  PG
                </div>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gold)' }}>
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
