'use client';

import { CSSProperties, ReactNode } from 'react';
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

const theme = adminTheme.dark;

export function getStatusBadgeStyles(
  variant: StatusBadgeVariant
): CSSProperties {
  const variants: Record<StatusBadgeVariant, CSSProperties> = {
    accent: {
      color: 'var(--gold)',
      backgroundColor: 'rgba(var(--accent-rgb), 0.14)',
      border: '1px solid rgba(var(--accent-rgb), 0.28)',
    },
    neutral: {
      color: theme.muted,
      backgroundColor: 'var(--admin-surface-raised)',
      border: `1px solid ${theme.border}`,
    },
    warning: {
      color: 'var(--warn)',
      backgroundColor: 'rgba(176, 125, 42, 0.12)',
      border: '1px solid rgba(176, 125, 42, 0.28)',
    },
    danger: {
      color: 'var(--alert)',
      backgroundColor: 'rgba(179, 57, 43, 0.1)',
      border: '1px solid rgba(179, 57, 43, 0.25)',
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
  const base = getStatusBadgeStyles(variant);
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
