'use client';

import { CSSProperties, ReactNode } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { adminTheme } from '../lib/adminTheme';

export type StatusBadgeVariant = 'accent' | 'neutral' | 'warning' | 'danger';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}

export function agreementStatusToBadgeVariant(status: string): StatusBadgeVariant {
  switch (status.toUpperCase()) {
    case 'LIVE':
    case 'COMPLETED':
      return 'accent';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function paymentStatusToBadgeVariant(paymentStatus: string): StatusBadgeVariant {
  const lower = paymentStatus.toLowerCase();
  if (lower.includes('not paid') || lower.includes('unpaid')) return 'warning';
  return 'neutral';
}

export function getStatusBadgeStyles(
  variant: StatusBadgeVariant,
  isDark: boolean
): CSSProperties {
  const theme = isDark ? adminTheme.dark : adminTheme.light;

  const variants: Record<StatusBadgeVariant, CSSProperties> = {
    accent: {
      color: 'var(--accent)',
      backgroundColor: isDark ? 'rgba(29, 158, 117, 0.14)' : 'rgba(29, 158, 117, 0.12)',
      border: `1px solid ${isDark ? 'rgba(29, 158, 117, 0.28)' : 'rgba(29, 158, 117, 0.22)'}`,
    },
    neutral: {
      color: theme.muted,
      backgroundColor: isDark ? '#2a322a' : '#f1f5f9',
      border: `1px solid ${theme.border}`,
    },
    warning: {
      color: isDark ? '#fbbf24' : '#b45309',
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(245, 158, 11, 0.1)',
      border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.28)' : 'rgba(245, 158, 11, 0.25)'}`,
    },
    danger: {
      color: isDark ? '#f87171' : '#dc2626',
      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.08)',
      border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(220, 38, 38, 0.18)'}`,
    },
  };

  return {
    fontSize: '12px',
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: '9999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    flexShrink: 0,
    lineHeight: 1.3,
    ...variants[variant],
  };
}

export function StatusBadge({
  variant,
  children,
  onClick,
  title,
  style,
}: StatusBadgeProps) {
  const { isDark } = useDarkMode();
  const base = getStatusBadgeStyles(variant, isDark);
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      style={{
        ...base,
        cursor: onClick ? 'pointer' : undefined,
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
