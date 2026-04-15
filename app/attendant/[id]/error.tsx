'use client';

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
        backgroundColor: '#080c08',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1d1a',
          padding: '48px',
          borderRadius: '12px',
          border: '1px solid #2d3530',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#dc2626',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '28px',
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
          }}
        >
          Error Loading Page
        </h1>
        <p
          style={{
            color: '#8f9a8f',
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
              backgroundColor: '#080c08',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #2d3530',
            }}
          >
            <summary
              style={{
                color: '#8f9a8f',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                color: '#dc2626',
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
            backgroundColor: '#4a9e72',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3d8560';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#4a9e72';
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}




