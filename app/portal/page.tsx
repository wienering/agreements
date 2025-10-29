import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Client Portal | Photobooth Guys - Access Your Photo Booth Rental Agreements',
  description: 'Access your photo booth rental agreements, view invoices, track payments, and manage your event details with Photobooth Guys Client Portal. Secure access to your photo booth rental services, conveyances, and documentation.',
  keywords: [
    'photo booth rental',
    'photobooth guys',
    'client portal',
    'photo booth rental agreements',
    'event rental portal',
    'photo booth services',
    'rental agreements',
    'event management',
    'photo booth bookings',
    'client access',
    'agreement portal',
    'rental services',
    'event photography',
    'photo booth Toronto',
    'party rental services'
  ],
  openGraph: {
    title: 'Photobooth Guys Client Portal - Access Your Rental Agreements',
    description: 'Securely access your photo booth rental agreements, invoices, and event details.',
    type: 'website',
    url: 'https://agreements.photoboothguys.ca/portal',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-emerald-200/70 bg-white/70 backdrop-blur dark:border-emerald-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500 text-white font-bold text-lg">
              PG
            </div>
            <div className="leading-tight">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Photobooth Guys</p>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Client Portal
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
            Photobooth Guys
            <span className="block text-emerald-600 dark:text-emerald-400 mt-2">
              Client Portal
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-slate-600 dark:text-slate-300">
            Access your photo booth rental agreements, view invoices, track payments, and manage your event details all in one secure place.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              View Agreements
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Access all your photo booth rental agreements in one convenient location. Review terms, dates, and package details.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Payment Management
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              View and pay invoices, track payment status, and access receipts for your photo booth rental services.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Event Details
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Manage your event information, view schedules, and access important details about your photo booth rental.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Secure Access
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Your data is protected with secure email verification and encrypted sessions. Access your portal safely from anywhere.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Gallery Access
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Access your event photo galleries and download memories from your photo booth rental experience.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Template Selection
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Choose and customize photo booth templates for your event. Browse options and make selections with ease.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-2xl p-12 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Access Your Portal?
            </h2>
            <p className="text-lg text-emerald-50 mb-8 max-w-2xl mx-auto">
              Securely log in to access your photo booth rental agreements, manage payments, view galleries, and more.
            </p>
            <Link
              href="/portal/login"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-emerald-600 bg-white rounded-md shadow-lg hover:bg-emerald-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              Access Portal
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-8 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              About Photo Booth Rental Services
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Photobooth Guys provides premium photo booth rental services for events throughout the region. Our client portal allows you to manage your rental agreements, track payments, and access all the resources you need for your event planning.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-8 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Need Help?
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              If you're having trouble accessing your portal or have questions about your photo booth rental agreement, please contact us. We're here to help ensure your event experience is seamless.
            </p>
            <a
              href="mailto:info@photoboothguys.ca"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              Contact Support →
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-200 bg-white py-8 dark:border-emerald-800 dark:bg-slate-900 mt-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <span>© {new Date().getFullYear()} Photobooth Guys • Client Portal</span>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <span>Secure • Encrypted</span>
              <Link href="/portal/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

