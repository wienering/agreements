'use client';

import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from 'react';
import { adminTheme } from '../lib/adminTheme';

export type AdminButtonVariant = 'primary' | 'ghost' | 'danger';
export type AdminButtonSize = 'default' | 'compact';

type SharedProps = {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const theme = adminTheme.admin;

export function getAdminButtonStyles(
  variant: AdminButtonVariant,
  size: AdminButtonSize,
  opts?: { fullWidth?: boolean; disabled?: boolean }
): CSSProperties {
  const height = size === 'compact' ? '30px' : '34px';
  const fontSize = size === 'compact' ? '12px' : '13px';
  const padding = size === 'compact' ? '0 10px' : '0 14px';

  const base: CSSProperties = {
    boxSizing: 'border-box',
    height,
    minHeight: height,
    maxHeight: height,
    padding,
    borderRadius: '2px',
    fontSize,
    lineHeight: 1,
    fontWeight: variant === 'primary' ? 600 : 500,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: opts?.disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    appearance: 'none',
    WebkitAppearance: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    margin: 0,
    textDecoration: 'none',
    width: opts?.fullWidth ? '100%' : undefined,
    opacity: opts?.disabled ? 0.55 : 1,
    transition: 'background-color 0.15s, color 0.15s, border-color 0.15s, filter 0.15s',
  };

  const variants: Record<AdminButtonVariant, CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1px solid var(--accent)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: `1px solid ${theme.border}`,
    },
    danger: {
      backgroundColor: 'transparent',
      color: 'var(--alert)',
      border: `1px solid ${theme.border}`,
    },
  };

  return { ...base, ...variants[variant] };
}

function applyHover(
  el: HTMLButtonElement | HTMLAnchorElement,
  variant: AdminButtonVariant,
  entering: boolean
) {
  if (entering) {
    if (variant === 'primary') {
      el.style.backgroundColor = 'var(--accent-hover)';
      el.style.borderColor = 'var(--accent-hover)';
    } else if (variant === 'ghost') {
      el.style.backgroundColor = theme.surfaceHover;
    } else {
      el.style.borderColor = 'var(--alert)';
      el.style.backgroundColor = 'rgba(158, 43, 43, 0.08)';
    }
    return;
  }
  if (variant === 'primary') {
    el.style.backgroundColor = 'var(--accent)';
    el.style.borderColor = 'var(--accent)';
  } else if (variant === 'ghost') {
    el.style.backgroundColor = 'transparent';
  } else {
    el.style.borderColor = theme.border;
    el.style.backgroundColor = 'transparent';
  }
}

interface AdminButtonProps
  extends SharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps> {}

export function AdminButton({
  variant = 'ghost',
  size = 'default',
  fullWidth = false,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  className = '',
  children,
  ...props
}: AdminButtonProps) {
  const sizeClass = size === 'compact' ? 'admin-btn--compact' : '';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`admin-btn ${sizeClass} ${className}`.trim()}
      style={{
        ...getAdminButtonStyles(variant, size, { fullWidth, disabled }),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) applyHover(e.currentTarget, variant, true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled) applyHover(e.currentTarget, variant, false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

interface AdminLinkProps
  extends SharedProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedProps> {}

/** Same visual system as AdminButton, for <a> navigation actions. */
export function AdminLink({
  variant = 'ghost',
  size = 'default',
  fullWidth = false,
  style,
  onMouseEnter,
  onMouseLeave,
  className = '',
  children,
  ...props
}: AdminLinkProps) {
  const sizeClass = size === 'compact' ? 'admin-btn--compact' : '';

  return (
    <a
      className={`admin-btn ${sizeClass} ${className}`.trim()}
      style={{
        ...getAdminButtonStyles(variant, size, { fullWidth }),
        ...style,
      }}
      onMouseEnter={(e) => {
        applyHover(e.currentTarget, variant, true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        applyHover(e.currentTarget, variant, false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
