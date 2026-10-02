'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';
import {
  AdminPreviewBanner,
  AgreementDocument,
} from '@/app/components/agreement/AgreementDocument';
import { AgreementMotionStyles } from '@/app/components/agreement/AgreementMotion';
import { AgreementStatusScreen } from '@/app/components/agreement/AgreementStatusScreen';
import type { AgreementRecord } from '@/app/components/agreement/types';
import { useAgreementDelivery } from '@/app/components/agreement/useAgreementDelivery';

export default function AdminPreviewPage() {
  const params = useParams();
  const token = params.token as string;
  const hasFetchedData = useRef(false);
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const delivery = useAgreementDelivery(token, agreement, true);

  useEffect(() => {
    document.title = 'Agreement Preview | Admin | Photobooth Guys';
  }, []);

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await adminFetch(`/api/agreements/admin-preview?token=${token}`);

      if (response.ok) {
        const data = (await response.json()) as AgreementRecord;
        // The preview API fills tokens and returns that document as template.htmlContent,
        // while customHtmlContent is still the stored source. Keep the filled copy in
        // the custom slot so the shared rule selects it without showing raw tokens.
        setAgreement({
          ...data,
          customHtmlContent: data.customHtmlContent ? data.template.htmlContent : data.customHtmlContent,
        });
        setLoading(false);
      } else if (response.status === 401) {
        setError('Authentication required. Please log in as admin.');
        setLoading(false);
      } else if (response.status === 403) {
        setError('Admin access required.');
        setLoading(false);
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
        setLoading(false);
      } else {
        setError('Failed to load agreement.');
        setLoading(false);
      }
    } catch {
      setError('Error loading agreement.');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hasFetchedData.current) return;
    if (token) {
      hasFetchedData.current = true;
      fetchAgreement();
    }
  }, [token, fetchAgreement]);

  useEffect(() => {
    if (agreement) {
      document.title = `Admin Preview - ${agreement.client.firstName} ${agreement.client.lastName}`;
    } else {
      document.title = 'Admin Preview - Loading...';
    }
  }, [agreement]);

  if (loading) {
    return (
      <AgreementStatusScreen
        kind="loading"
        title="Loading Agreement Preview"
        message="Please wait while we load the agreement..."
      />
    );
  }

  if (error) {
    return (
      <AgreementStatusScreen
        kind="error"
        title={error.includes('Authentication') || error.includes('Admin access') ? 'Access Denied' : 'Agreement Not Found'}
        message={error}
        support="admin"
      />
    );
  }

  return (
    <>
      <AgreementMotionStyles />
      <div data-surface="client" className="min-h-screen bg-paper font-ui">
        <AdminPreviewBanner />
        {agreement && <AgreementDocument mode="adminPreview" agreement={agreement} delivery={delivery} />}
      </div>
    </>
  );
}
