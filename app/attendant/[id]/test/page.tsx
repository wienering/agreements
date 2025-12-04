import { Metadata } from 'next';

interface TestPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: TestPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Test Page - ${id}`,
  };
}

export default async function TestPage({ params }: TestPageProps) {
  console.log('[TestPage] Starting test page render');
  
  let id: string;
  try {
    id = await params;
    console.log('[TestPage] Params resolved, id:', id);
  } catch (error) {
    console.error('[TestPage] Error resolving params:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Error resolving params</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }

  try {
    console.log('[TestPage] Rendering test page...');
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f1f5f9',
          padding: '40px',
          fontFamily: 'sans-serif',
        }}
      >
        <h1 style={{ color: '#ffffff', marginBottom: '20px' }}>Test Page</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          This is a test page to verify the route pattern works.
        </p>
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
          <p style={{ color: '#f1f5f9' }}>
            <strong>Agreement ID:</strong> {id}
          </p>
          <p style={{ color: '#94a3b8', marginTop: '10px' }}>
            If you can see this page, the route is working correctly.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[TestPage] Error rendering:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#dc2626', color: '#fff' }}>
        <h1>Error rendering test page</h1>
        <pre>{String(error)}</pre>
        {error instanceof Error && <pre>{error.stack}</pre>}
      </div>
    );
  }
}

