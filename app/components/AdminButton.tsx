'use client';

import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
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

function useAdminButtonTheme() {
  const { isDark } = useDarkMode();
  return isDark ? adminTheme.dark : adminTheme.light;
}

export function getAdminButtonStyles(
  variant: AdminButtonVariant,
  size: AdminButtonSize,
  isDark: boolean,
  opts?: { fullWidth?: boolean; disabled?: boolean }
): CSSProperties {
  const theme = isDark ? adminTheme.dark : adminTheme.light;
  const height = size === 'compact' ? '30px' : '34px';
  const fontSize = size === 'compact' ? '12px' : '13px';
  const padding = size === 'compact' ? '0 10px' : '0 14px';

  const base: CSSProperties = {
    boxSizing: 'border-box',
    height,
    minHeight: height,
    maxHeight: height,
    padding,
    borderRadius: '6px',
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
      color: '#04342C',
      border: '1px solid var(--accent)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: `0.5px solid ${theme.border}`,
    },
    danger: {
      backgroundColor: 'transparent',
      color: isDark ? '#f87171' : '#dc2626',
      border: `0.5px solid ${theme.border}`,
    },
  };

  return { ...base, ...variants[variant] };
}

function applyHover(
  el: HTMLButtonElement | HTMLAnchorElement,
  variant: AdminButtonVariant,
  isDark: boolean,
  entering: boolean
) {
  const theme = isDark ? adminTheme.dark : adminTheme.light;
  if (entering) {
    if (variant === 'primary') {
      el.style.filter = 'brightness(0.93)';
    } else if (variant === 'ghost') {
      el.style.backgroundColor = theme.surfaceHover;
    } else {
      el.style.borderColor = isDark ? '#f87171' : '#dc2626';
      el.style.backgroundColor = isDark
        ? 'rgba(248, 113, 113, 0.08)'
        : 'rgba(220, 38, 38, 0.06)';
    }
    return;
  }
  if (variant === 'primary') {
    el.style.filter = 'none';
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
  const { isDark } = useDarkMode();
  const sizeClass = size === 'compact' ? 'admin-btn--compact' : '';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`admin-btn ${sizeClass} ${className}`.trim()}
      style={{
        ...getAdminButtonStyles(variant, size, isDark, { fullWidth, disabled }),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) applyHover(e.currentTarget, variant, isDark, true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled) applyHover(e.currentTarget, variant, isDark, false);
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
  const { isDark } = useDarkMode();
  const sizeClass = size === 'compact' ? 'admin-btn--compact' : '';

  return (
    <a
      className={`admin-btn ${sizeClass} ${className}`.trim()}
      style={{
        ...getAdminButtonStyles(variant, size, isDark, { fullWidth }),
        ...style,
      }}
      onMouseEnter={(e) => {
        applyHover(e.currentTarget, variant, isDark, true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        applyHover(e.currentTarget, variant, isDark, false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
