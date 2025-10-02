'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊', href: '/admin' },
    { id: 'clients', label: 'Clients', icon: '👥', href: '/admin/clients' },
    { id: 'templates', label: 'Templates', icon: '📄', href: '/admin/templates' },
    { id: 'agreements', label: 'Agreements', icon: '📝', href: '/admin/agreements' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: '#1f2937', 
        color: 'white', 
        padding: '24px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Agreements</h1>
          <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>Admin Dashboard</p>
        </div>
        
        <nav>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  padding: '12px 24px',
                  backgroundColor: isActive ? '#374151' : 'transparent',
                  color: 'white',
                  textDecoration: 'none',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '16px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#374151';
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
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}