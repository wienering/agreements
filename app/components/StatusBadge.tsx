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

const theme = adminTheme.admin;

export function getStatusBadgeStyles(
  variant: StatusBadgeVariant
): CSSProperties {
  const variants: Record<StatusBadgeVariant, CSSProperties> = {
    accent: {
      color: 'var(--accent)',
      backgroundColor: 'var(--accent-wash)',
      border: '1px solid rgba(var(--accent-rgb), 0.22)',
    },
    neutral: {
      color: theme.muted,
      backgroundColor: 'var(--admin-surface-raised)',
      border: `1px solid ${theme.border}`,
    },
    warning: {
      color: 'var(--status-wait)',
      backgroundColor: 'rgba(var(--status-wait-rgb), 0.09)',
      border: '1px solid rgba(var(--status-wait-rgb), 0.22)',
    },
    danger: {
      color: 'var(--status-action)',
      backgroundColor: 'rgba(var(--status-action-rgb), 0.08)',
      border: '1px solid rgba(var(--status-action-rgb), 0.2)',
    },
  };

  return {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    padding: '3px 8px',
    borderRadius: '2px',
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
