'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

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
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page without sidebar
  if (status === 'unauthenticated') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: '#1e293b', 
        color: 'white', 
        padding: '24px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
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
        
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.tooltip}
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

        {/* Logout Button */}
        <div style={{ padding: '0 24px', marginTop: 'auto', marginBottom: '24px' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
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

      {/* Main Content */}
      <div style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {children}
      </div>
    </div>
  );
}