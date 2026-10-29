'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { UIcon } from '../components/UIcon';
import { AdminButton } from '../components/AdminButton';

const navGroups = [
  {
    id: 'today',
    label: 'Today',
    items: [
      { id: 'overview', label: 'Overview', iconName: 'chart-line-up', href: '/admin', tooltip: 'Dashboard overview and statistics' },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    items: [
      { id: 'leads', label: 'Leads', iconName: 'target', href: '/admin/leads', tooltip: 'Lead pipeline and follow-up tracking' },
      { id: 'quotes', label: 'Quotes', iconName: 'dollar', href: '/admin/quotes', tooltip: 'Generate quotes for potential clients' },
      { id: 'agreements', label: 'Agreements', iconName: 'file-signature', href: '/admin/agreements', tooltip: 'Manage client agreements' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    items: [
      { id: 'clients', label: 'Clients', iconName: 'users', href: '/admin/clients', tooltip: 'Manage client information' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { id: 'templates', label: 'Templates', iconName: 'document', href: '/admin/templates', tooltip: 'Create and edit agreement templates' },
      { id: 'attendants', label: 'Attendants', iconName: 'user', href: '/admin/attendants', tooltip: 'Attendant records and double-booking buffers' },
      { id: 'backdrop-links', label: 'Backdrop Links', iconName: 'picture', href: '/admin/backdrop-links', tooltip: 'Manage backdrop selection URLs for the client portal' },
      { id: 'attendant-groups', label: 'Attendant Hubs', iconName: 'users-alt', href: '/admin/attendant-groups', tooltip: 'Manage groups of attendants and their hub links' },
      { id: 'import-events', label: 'Import Events', iconName: 'file-import', href: '/admin/events/import', tooltip: 'Import events from Bookly CSV export' },
      { id: 'connected-apps', label: 'Connected apps', iconName: 'link', href: '/admin/connected-apps', tooltip: 'Claude MCP connector grants' },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenuOnDesktop = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    closeMenuOnDesktop();
    window.addEventListener('resize', closeMenuOnDesktop);
    return () => window.removeEventListener('resize', closeMenuOnDesktop);
  }, []);

  const isPreviewRoute = pathname?.startsWith('/admin/preview/');

  if (status === 'loading') {
    return (
      <div
        data-surface="admin"
        className="flex min-h-screen items-center justify-center bg-admin-bg text-admin-text"
      >
        <div className="text-center">
          <UIcon name="spinner" className="mb-4 inline-flex animate-spin text-2xl text-admin-muted" />
          <p className="text-base">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div data-surface="admin">{children}</div>;
  }

  if (isPreviewRoute) {
    return (
      <div data-surface="client" className="min-h-screen bg-paper">
        {children}
      </div>
    );
  }

  return (
    <div data-surface="admin" className="flex min-h-screen bg-admin-bg">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[998] bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed top-0 left-0 z-[999] flex h-screen w-[280px] flex-col overflow-hidden border-r border-admin-border bg-admin-sidebar py-6 text-admin-text transition-transform duration-300 ease-in-out md:w-[250px] md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* The logo lockup sits on the light ground at its natural proportions:
            no tile, no container, no background behind it. Swap this block for
            <Image src="/brand/logo-lockup.svg" width={132} /> once that file
            lands — see the file table in DESIGN.md. */}
        <div className="mb-7 px-6">
          <Link href="/admin" className="inline-block no-underline">
            <span className="block text-[20px] font-semibold leading-[1.1] tracking-[0.02em] text-admin-text">
              Photobooth Guys
            </span>
            <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-admin-muted">
              Agreements
            </span>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto">
          {navGroups.map((group, groupIndex) => (
            <div key={group.id} className={groupIndex === 0 ? undefined : 'mt-4'}>
              <p
                id={`admin-nav-${group.id}`}
                className={`m-0 px-6 pb-1.5 text-[10px] font-semibold uppercase leading-[1.2] tracking-[0.16em] text-admin-muted ${
                  groupIndex === 0 ? 'pt-0' : 'pt-2'
                }`}
              >
                {group.label}
              </p>
              <div role="group" aria-labelledby={`admin-nav-${group.id}`}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.tooltip}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 border-l-2 px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.09em] no-underline transition-colors duration-200 ${
                        isActive
                          ? 'border-accent bg-accent-wash text-accent'
                          : 'border-transparent bg-transparent text-admin-text hover:bg-admin-surface-raised'
                      }`}
                    >
                      <UIcon name={item.iconName} className="w-[1.25em] shrink-0 text-[20px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-admin-border px-6 pb-8 pt-4">
          <div>
            <AdminButton
              variant="danger"
              fullWidth
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              title="Sign out of admin dashboard"
            >
              <UIcon name="sign-out" className="text-base" />
              Logout
            </AdminButton>
          </div>
          <p className="mt-3 text-[10px] leading-[1.35] text-admin-muted">
            <a
              href="https://www.flaticon.com/uicons"
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit underline"
            >
              UIcons by Flaticon
            </a>
          </p>
        </div>
      </div>

      <div className="w-full flex-1 bg-admin-bg md:ml-[250px] md:w-auto">
        <div className="sticky top-0 z-[997] flex items-center border-b border-admin-border bg-admin-card px-5 py-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-12 w-12 min-w-12 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-3 text-admin-text transition-opacity duration-150 active:opacity-70"
            title="Open menu"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <div className="flex flex-1 items-center justify-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-3 text-inherit no-underline"
            >
              <span className="text-base font-semibold text-admin-text">
                Photobooth Guys
              </span>
            </Link>
          </div>
          <div className="w-12 min-w-12" />
        </div>
        <div className="admin-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
