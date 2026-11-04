'use client';

import { useEffect, useRef } from 'react';

/** TemplatesBooth widget id, the same one the photoboothguys.ca templates chooser page uses. */
const TEMPLATESBOOTH_WIDGET_ID = 'w_bxqrs6nxrc';

/**
 * The TemplatesBooth print template chooser, loaded inside the portal. The widget renders where
 * its script tag sits, so the script is added into this container (and removed on leave).
 */
export function PrintTemplatesWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://widget.templatesbooth.com/embed.js';
    script.dataset.tbw = TEMPLATESBOOTH_WIDGET_ID;
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="min-h-[200px] w-full" />;
}
