'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useState, useEffect } from 'react';

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
    { id: 'overview', label: 'Overview', icon: '📊', href: '/admin', tooltip: 'Dashboard overview and statistics' },
    { id: 'clients', label: 'Clients', icon: '👥', href: '/admin/clients', tooltip: 'Manage client information' },
    { id: 'templates', label: 'Templates', icon: '📄', href: '/admin/templates', tooltip: 'Create and edit agreement templates' },
    { id: 'agreements', label: 'Agreements', icon: '📝', href: '/admin/agreements', tooltip: 'Manage client agreements' },
  ];

  // Show loading state
  if (status === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        color: isDark ? '#f8fafc' : '#0f172a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page without sidebar
  if (status === 'unauthenticated') {
    return <>{children}</>;
  }

  const sidebarBg = isDark ? '#1e293b' : '#1e293b';
  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

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
        position: isMobile ? 'fixed' : 'relative',
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
              backgroundColor: '#fbbf24', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1e293b'
            }}>
              PG
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Photobooth Guys</h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>Agreements Admin</p>
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
                  backgroundColor: isActive ? '#334155' : 'transparent',
                  color: 'white',
                  textDecoration: 'none',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '16px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#334155';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ 
          padding: '16px 24px', 
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
                backgroundColor: '#374151',
                color: 'white',
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
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          {/* Logout Button */}
          <div>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              style={{
                width: '100%',
                padding: '10px 20px',
                backgroundColor: '#dc2626',
                color: 'white',
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
              title="Sign out of admin dashboard"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        backgroundColor: mainBg,
        marginLeft: isMobile ? '0' : '0',
        width: isMobile ? '100%' : 'auto'
      }}>
        {/* Mobile Header */}
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            position: 'sticky',
            top: 0,
            zIndex: 997,
          }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: textColor,
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Open menu"
            >
              ☰
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: '#fbbf24', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#1e293b'
              }}>
                PG
              </div>
              <span style={{ fontSize: '16px', fontWeight: '600', color: textColor }}>
                Photobooth Guys
              </span>
            </div>
            <div style={{ width: '40px' }} /> {/* Spacer for centering */}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}