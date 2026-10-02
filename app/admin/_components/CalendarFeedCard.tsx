'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { AdminButton } from '../../components/AdminButton';

type CalendarFeedCardProps = {
  className: string;
};

/** Subscribable calendar feed URL. Renders nothing unless the admin-only route returns a URL. */
export function CalendarFeedCard({ className }: CalendarFeedCardProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch('/api/admin/calendar-feed')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { url?: string } | null) => {
        if (!cancelled && data?.url) setUrl(data.url);
      })
      .catch((error) => console.error('Error fetching calendar feed URL:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!url) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy calendar feed URL:', error);
      inputRef.current?.select();
    }
  };

  return (
    <div className={`${className} mb-7`}>
      <h3 className="m-0 mb-1.5 text-lg font-bold text-admin-text">Calendar feed</h3>
      <p className="m-0 mb-3.5 text-[13px] leading-[1.45] text-admin-muted">
        In Google Calendar, choose Other calendars, then From URL, and paste this link. Signed events
        appear and stay up to date.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url}
          aria-label="Calendar feed URL"
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 basis-[240px] rounded-sm border border-admin-hairline bg-admin-bg px-3 py-2 font-mono text-xs text-admin-text"
        />
        <AdminButton variant="ghost" onClick={copyUrl}>
          {copied ? 'Copied' : 'Copy'}
        </AdminButton>
      </div>
    </div>
  );
}
