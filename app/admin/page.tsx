'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminHome() {
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
      <div style={{ flex: 1, padding: '24px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '28px', color: '#1f2937' }}>Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Total Clients</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Templates</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Active Agreements</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Signed This Week</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
          </div>
        </div>
      </div>
    </div>
  );
}