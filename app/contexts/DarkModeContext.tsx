'use client';

/**
 * Admin is warm-dark only (stage 2). isDark branches in page code remain until stage 3;
 * this stub keeps them on the dark path without localStorage or a provider.
 */
export function useDarkMode() {
  return {
    isDark: true as const,
    toggleDarkMode: () => {},
  };
}
