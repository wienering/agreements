'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('portal_session_token');
    if (!token) {
      router.push('/portal/login');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome to your Client Portal
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Here are all your agreements with Photobooth Guys
        </p>
      </div>
      
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Dashboard Ready</h3>
        <p className="text-slate-600 dark:text-slate-300">
          The dashboard is now functional. Full features will be added in the next update.
        </p>
      </div>
    </div>
  );
}