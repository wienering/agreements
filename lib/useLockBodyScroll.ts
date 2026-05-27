'use client';

import { useLayoutEffect } from 'react';

/** Locks background scroll without jumping to top (preserves scrollbar-gutter shifts). */
export function useLockBodyScroll(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
