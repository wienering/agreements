'use client';

import { ReactNode } from 'react';

interface AdminMobileDataCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedText: string;
}

/** Stacked row card for admin tables below 768px — matches Clients/Agreements cards. */
export function AdminMobileDataCard({
  title,
  subtitle,
  children,
  actions,
  cardBg,
  borderColor,
  textColor,
  mutedText,
}: AdminMobileDataCardProps) {
  return (
    <div
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '2px',
        padding: '16px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '16px',
            color: textColor,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: '13px',
              color: mutedText,
              marginTop: '4px',
              wordBreak: 'break-word',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
      {actions ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

interface AdminMobileFieldProps {
  label: string;
  children: ReactNode;
  mutedText: string;
}

export function AdminMobileField({ label, children, mutedText }: AdminMobileFieldProps) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: mutedText,
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}
