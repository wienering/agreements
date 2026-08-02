'use client';

import { UIcon } from '../../components/UIcon';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--admin-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--admin-surface)',
          padding: '48px',
          borderRadius: '2px',
          border: '1px solid var(--admin-hairline)',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--alert)',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '28px',
          }}
        >
          <UIcon name="circle-exclamation" style={{ fontSize: '28px', color: 'var(--admin-text)' }} title="Error" />
        </div>
        <h1
          className="admin-page-title"
          style={{
            color: 'var(--admin-text)',
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
          }}
        >
          Error Loading Page
        </h1>
        <p
          style={{
            color: 'var(--admin-muted)',
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          {error.message || 'An error occurred while loading this page.'}
        </p>
        {error.stack && (
          <details
            style={{
              marginBottom: '24px',
              textAlign: 'left',
              backgroundColor: 'var(--admin-bg)',
              padding: '16px',
              borderRadius: '2px',
              border: '1px solid var(--admin-hairline)',
            }}
          >
            <summary
              style={{
                color: 'var(--admin-muted)',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                color: 'var(--alert)',
                fontSize: '12px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-on)',
            border: 'none',
            borderRadius: '2px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}




