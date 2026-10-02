'use client';

import { adminFetch } from '@/lib/adminFetch';
import { devLog } from '@/lib/logger';
import {
  buildAgreementTimeline,
  type AgreementTimelineEntry,
} from '@/lib/agreementTrackingUi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractAttendantIdFromUrl,
  galleryLinksFromAgreement,
  normalizePaymentStatus,
} from '../_components/agreementUtils';
import type { Agreement, BackdropLinkOption, BackdropOption, GalleryLink } from '../_components/types';
import { patchAgreement } from './patchAgreement';

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

const defaultSections = {
  content: false,
  secondSigner: false,
  portal: true,
  attendant: false,
  tracking: false,
  clientNotes: false,
};

export function useAgreementDetail({
  backdropLinks,
  replaceAgreement,
  showToast,
}: {
  backdropLinks: BackdropLinkOption[];
  replaceAgreement: (agreement: Agreement) => void;
  showToast: ShowToast;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agreementId = searchParams.get('agreement');

  const [detail, setDetail] = useState<Agreement | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editSecondSignerEnabled, setEditSecondSignerEnabled] = useState(false);
  const [editSecondSignerFirstName, setEditSecondSignerFirstName] = useState('');
  const [editSecondSignerLastName, setEditSecondSignerLastName] = useState('');
  const [editSecondSignerEmail, setEditSecondSignerEmail] = useState('');
  const [editSecondSignerPhone, setEditSecondSignerPhone] = useState('');
  const [editRequireBothSignatures, setEditRequireBothSignatures] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [stripeReceiptLink, setStripeReceiptLink] = useState('');
  const [galleryLinks, setGalleryLinks] = useState<GalleryLink[]>([]);
  const [galleryEmailSentAt, setGalleryEmailSentAt] = useState<Date | null>(null);
  const [sendingGalleryEmail, setSendingGalleryEmail] = useState(false);
  const [showGalleryReadyPreview, setShowGalleryReadyPreview] = useState(false);
  const [galleryReadyPreview, setGalleryReadyPreview] = useState<{
    subject: string;
    html: string;
    canSend: boolean;
    sendBlockedReason?: string;
  } | null>(null);
  const [loadingGalleryReadyPreview, setLoadingGalleryReadyPreview] = useState(false);
  const [nextAction, setNextAction] = useState('');
  const [selectedBackdropLinkId, setSelectedBackdropLinkId] = useState('');
  const [backdropOptions, setBackdropOptions] = useState<BackdropOption[]>([]);
  const [selectedBackdropName, setSelectedBackdropName] = useState('');
  const [loadingBackdropOptions, setLoadingBackdropOptions] = useState(false);
  const [attendantId, setAttendantId] = useState<string | null>(null);
  const [sections, setSections] = useState(defaultSections);
  const [trackingTimeline, setTrackingTimeline] = useState<AgreementTimelineEntry[]>([]);
  const [trackingAgreementId, setTrackingAgreementId] = useState<string | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [updatingChaserPaused, setUpdatingChaserPaused] = useState(false);
  const [clientNotes, setClientNotes] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [clientNotesAgreementId, setClientNotesAgreementId] = useState<string | null>(null);
  const [loadingClientNotes, setLoadingClientNotes] = useState(false);
  const hydratedFor = useRef<string | null>(null);
  const backdropLinksRef = useRef(backdropLinks);
  backdropLinksRef.current = backdropLinks;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const closeAgreementRef = useRef<() => void>(() => {});
  const hydrateRef = useRef<(agreement: Agreement) => void>(() => {});
  const loadBackdropOptionsRef = useRef<(backdropLinkId: string) => void>(() => {});
  const optionsRequestedFor = useRef<string | null>(null);

  const applyServerAgreement = useCallback(
    (next: Agreement) => {
      replaceAgreement(next);
      setDetail((prev) => (prev && prev.id === next.id ? { ...prev, ...next } : prev));
    },
    [replaceAgreement],
  );

  const openAgreement = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('agreement', id);
      router.push(`/admin/agreements?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const closeAgreement = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('agreement');
    const query = params.toString();
    router.replace(query ? `/admin/agreements?${query}` : '/admin/agreements', { scroll: false });
  }, [router, searchParams]);
  closeAgreementRef.current = closeAgreement;

  const loadBackdropOptions = useCallback(
    async (backdropLinkId: string) => {
      const link = backdropLinksRef.current.find((item) => item.id === backdropLinkId);
      if (!backdropLinkId || !link?.url) {
        setAttendantId(null);
        setBackdropOptions([]);
        if (backdropLinkId && backdropLinksRef.current.length > 0) {
          showToast('Backdrop link URL not found. Please refresh and try again.', 'error');
        }
        return;
      }
      const extracted = extractAttendantIdFromUrl(link.url);
      if (!extracted) {
        setAttendantId(null);
        setBackdropOptions([]);
        showToast('Could not extract attendant ID from backdrop link URL. Please check the URL format.', 'error');
        return;
      }
      setAttendantId(extracted);
      setLoadingBackdropOptions(true);
      setBackdropOptions([]);
      try {
        const response = await adminFetch(`/api/agreements/backdrop-options?attendantId=${extracted}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.backdrops) {
            setBackdropOptions(data.backdrops || []);
            if (data.backdrops.length === 0) {
              devLog('No backdrop options available for this attendant');
            }
          } else {
            setBackdropOptions([]);
            showToast('Invalid response from backdrop options API', 'error');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to fetch backdrop options:', response.status, errorData);
          setBackdropOptions([]);
          showToast(errorData.error || 'Failed to load backdrop options. The backdrop tool may be unavailable.', 'error');
        }
      } catch (error: unknown) {
        console.error('Error fetching backdrop options:', error);
        setBackdropOptions([]);
        const message = error instanceof Error && error.message.includes('fetch')
          ? 'Unable to connect to backdrop tool. Please check your connection and try again.'
          : 'Error loading backdrop options';
        showToast(message, 'error');
      } finally {
        setLoadingBackdropOptions(false);
      }
    },
    [showToast],
  );
  loadBackdropOptionsRef.current = loadBackdropOptions;

  const hydrate = useCallback((agreement: Agreement) => {
    setEditingContent(agreement.customHtmlContent || agreement.template.htmlContent || '');
    setPaymentStatus(normalizePaymentStatus(agreement.paymentStatus));
    setStripePaymentLink(agreement.stripePaymentLink || '');
    setStripeReceiptLink(agreement.stripeReceiptLink || '');
    setGalleryLinks(galleryLinksFromAgreement(agreement));
    setGalleryEmailSentAt(agreement.galleryEmailSentAt ? new Date(agreement.galleryEmailSentAt) : null);
    setNextAction(agreement.nextAction || '');
    setSelectedBackdropLinkId(agreement.backdropLinkId || '');
    setSelectedBackdropName(agreement.selectedBackdropName || '');
    setEditSecondSignerEnabled(Boolean(agreement.secondSignerEnabled));
    setEditSecondSignerFirstName(agreement.secondSignerFirstName || '');
    setEditSecondSignerLastName(agreement.secondSignerLastName || '');
    setEditSecondSignerEmail(agreement.secondSignerEmail || '');
    setEditSecondSignerPhone(agreement.secondSignerPhone || '');
    setEditRequireBothSignatures(Boolean(agreement.requireBothSignatures));
    setSections(defaultSections);
    setClientNotes([]);
    setClientNotesAgreementId(null);
    setLoadingClientNotes(false);
    setTrackingTimeline([]);
    setTrackingAgreementId(null);
    setLoadingTracking(false);
    setUpdatingChaserPaused(false);
  }, []);
  hydrateRef.current = hydrate;

  useEffect(() => {
    if (!agreementId) {
      hydratedFor.current = null;
      optionsRequestedFor.current = null;
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    adminFetch(`/api/agreements/${encodeURIComponent(agreementId)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          showToastRef.current('Agreement not found', 'error');
          closeAgreementRef.current();
          return;
        }
        const agreement = (await response.json()) as Agreement;
        if (cancelled) return;
        setDetail(agreement);
        if (hydratedFor.current !== agreement.id) {
          hydratedFor.current = agreement.id;
          optionsRequestedFor.current = null;
          hydrateRef.current(agreement);
          if (!agreement.backdropLinkId) {
            setAttendantId(null);
            setBackdropOptions([]);
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching agreement:', error);
        if (!cancelled) showToastRef.current('Failed to load agreement', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agreementId]);

  useEffect(() => {
    if (!detail?.backdropLinkId || backdropLinks.length === 0) return;
    if (selectedBackdropLinkId !== detail.backdropLinkId) return;
    if (optionsRequestedFor.current === detail.backdropLinkId) return;
    optionsRequestedFor.current = detail.backdropLinkId;
    loadBackdropOptionsRef.current(detail.backdropLinkId);
  }, [backdropLinks, detail?.backdropLinkId, detail?.id, selectedBackdropLinkId]);

  const handleBackdropLinkChange = (backdropLinkId: string) => {
    setSelectedBackdropLinkId(backdropLinkId);
    setSelectedBackdropName('');
    if (!backdropLinkId) {
      setAttendantId(null);
      setBackdropOptions([]);
      return;
    }
    loadBackdropOptions(backdropLinkId);
  };

  const handleSaveBackdropSelection = async () => {
    if (!detail) {
      showToast('No agreement selected', 'error');
      return;
    }
    setSaving(true);
    try {
      let latest = detail;
      if (selectedBackdropLinkId) {
        try {
          latest = await patchAgreement(detail.id, { backdropLinkId: selectedBackdropLinkId });
          applyServerAgreement(latest);
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to save attendant', 'error');
          return;
        }
      }

      const response = await adminFetch('/api/agreements/update-backdrop-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: detail.id,
          backdropName: selectedBackdropName || '',
        }),
      });

      if (response.ok) {
        showToast(selectedBackdropName ? 'Backdrop selection saved successfully!' : 'Backdrop selection cleared successfully!');
        const updated = { ...latest, selectedBackdropName: selectedBackdropName || null };
        applyServerAgreement(updated);
        if (!selectedBackdropName) setSelectedBackdropName('');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to save backdrop selection', 'error');
      }
    } catch (error) {
      console.error('Error saving backdrop selection:', error);
      showToast('Failed to save backdrop selection', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearBackdropSelection = async () => {
    if (!detail) return;
    if (!confirm('Are you sure you want to clear the backdrop selection?')) return;
    setSaving(true);
    try {
      const response = await adminFetch('/api/agreements/update-backdrop-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: detail.id, backdropName: '' }),
      });
      if (response.ok) {
        showToast('Backdrop selection cleared successfully!');
        setSelectedBackdropName('');
        applyServerAgreement({ ...detail, selectedBackdropName: null });
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to clear backdrop selection', 'error');
      }
    } catch (error) {
      console.error('Error clearing backdrop selection:', error);
      showToast('Failed to clear backdrop selection', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrackingSection = async () => {
    const willExpand = !sections.tracking;
    setSections((current) => ({ ...current, tracking: willExpand }));
    if (!willExpand || !detail) return;
    if (trackingAgreementId === detail.id) return;

    setLoadingTracking(true);
    try {
      const response = await adminFetch(`/api/agreements/${encodeURIComponent(detail.id)}/activity`);
      if (response.ok) {
        const data = await response.json();
        setTrackingTimeline(
          buildAgreementTimeline(data.activities || [], {
            status: data.legacy?.status ?? detail.status,
            lastEmailedAt: data.legacy?.lastEmailedAt ?? null,
            emailSendCount: data.legacy?.emailSendCount ?? 0,
            firstViewedAt: data.legacy?.firstViewedAt ?? null,
            lastViewedAt: data.legacy?.lastViewedAt ?? null,
            signedAt: data.legacy?.signedAt ?? null,
            cancelledAt: data.legacy?.cancelledAt ?? null,
            reminderCount: data.legacy?.reminderCount ?? 0,
            lastReminderAt: data.legacy?.lastReminderAt ?? null,
          }),
        );
        setTrackingAgreementId(detail.id);
        if (typeof data.legacy?.chaserPaused === 'boolean') {
          applyServerAgreement({ ...detail, chaserPaused: data.legacy.chaserPaused });
        }
      } else {
        setTrackingTimeline([]);
      }
    } catch (error) {
      console.error('Error fetching agreement activity:', error);
      setTrackingTimeline([]);
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleToggleChaserPaused = async (chaserPaused: boolean) => {
    if (!detail) return;
    setUpdatingChaserPaused(true);
    try {
      const updated = await patchAgreement(detail.id, { chaserPaused });
      applyServerAgreement(updated);
    } catch (error) {
      console.error('Error updating chaser pause:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update reminder settings', 'error');
    } finally {
      setUpdatingChaserPaused(false);
    }
  };

  const handleToggleClientNotesSection = async () => {
    const willExpand = !sections.clientNotes;
    setSections((current) => ({ ...current, clientNotes: willExpand }));
    if (!willExpand || !detail) return;

    if (clientNotesAgreementId !== detail.id) {
      setLoadingClientNotes(true);
      try {
        const response = await adminFetch(
          `/api/agreements/client-notes?agreementId=${encodeURIComponent(detail.id)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setClientNotes(data.notes || []);
          setClientNotesAgreementId(detail.id);
        } else {
          setClientNotes([]);
        }
      } catch (error) {
        console.error('Error fetching client notes:', error);
        setClientNotes([]);
      } finally {
        setLoadingClientNotes(false);
      }
    }

    if ((detail.unreadNotesCount ?? 0) > 0) {
      try {
        const updated = await patchAgreement(detail.id, { markNotesViewed: true });
        applyServerAgreement(updated);
      } catch (error) {
        console.error('Error marking notes as viewed:', error);
      }
    }
  };

  const handleSaveAgreement = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const response = await adminFetch('/api/agreements/update-agreement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: detail.id,
          htmlContent: editingContent,
          secondSignerEnabled: editSecondSignerEnabled,
          secondSignerFirstName: editSecondSignerEnabled ? editSecondSignerFirstName : null,
          secondSignerLastName: editSecondSignerEnabled ? editSecondSignerLastName : null,
          secondSignerEmail: editSecondSignerEnabled ? editSecondSignerEmail : null,
          secondSignerPhone: editSecondSignerEnabled ? editSecondSignerPhone : null,
          requireBothSignatures: editSecondSignerEnabled ? editRequireBothSignatures : false,
        }),
      });
      if (response.ok) {
        const updatedAgreement = (await response.json()) as Agreement;
        applyServerAgreement(updatedAgreement);
        showToast('Agreement saved successfully!');
      } else {
        try {
          const error = await response.json();
          showToast(`Error: ${error.error || error.message || 'Unknown error occurred'}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to save agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving agreement:', error);
      showToast('Failed to save agreement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePortalFields = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await patchAgreement(detail.id, {
        paymentStatus: paymentStatus || '',
        stripePaymentLink: stripePaymentLink || '',
        stripeReceiptLink: stripeReceiptLink || '',
        galleryLinks: galleryLinks.filter((link) => link.url.trim()),
        nextAction: nextAction || '',
        backdropLinkId: selectedBackdropLinkId || null,
      });
      applyServerAgreement(updated);
      showToast('Portal fields updated successfully!');
    } catch (error) {
      console.error('Error updating portal fields:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update portal fields', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendGalleryReadyEmail = async (): Promise<boolean> => {
    const validLinks = galleryLinks.filter((link) => link.url.trim());
    if (!detail || validLinks.length === 0) return false;
    try {
      validLinks.forEach((link) => new URL(link.url));
    } catch {
      showToast('Please enter valid gallery link URLs first', 'error');
      return false;
    }

    try {
      setSendingGalleryEmail(true);
      const response = await adminFetch('/api/agreements/send-gallery-ready-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: detail.id }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Gallery ready email sent to ${detail.client.email}!`);
        const sentAt = new Date();
        setGalleryEmailSentAt(sentAt);
        applyServerAgreement({ ...detail, galleryEmailSentAt: sentAt.toISOString() });
        return true;
      }
      showToast(`Error: ${data.error || 'Failed to send gallery ready email'}`, 'error');
      return false;
    } catch (error) {
      console.error('Error sending gallery ready email:', error);
      showToast('Failed to send gallery ready email. Please try again later.', 'error');
      return false;
    } finally {
      setSendingGalleryEmail(false);
    }
  };

  const closeGalleryReadyPreview = () => {
    setShowGalleryReadyPreview(false);
    setGalleryReadyPreview(null);
  };

  const handlePreviewGalleryReadyEmail = async () => {
    if (!detail) return;
    try {
      setLoadingGalleryReadyPreview(true);
      const response = await adminFetch(
        `/api/agreements/send-gallery-ready-email?agreementId=${encodeURIComponent(detail.id)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        showToast(`Error: ${data.error || 'Failed to load gallery ready email preview'}`, 'error');
        return;
      }
      setGalleryReadyPreview({
        subject: data.subject ?? '',
        html: data.html ?? '',
        canSend: data.canSend !== false,
        sendBlockedReason: data.sendBlockedReason,
      });
      setShowGalleryReadyPreview(true);
    } catch (error) {
      console.error('Error loading gallery ready email preview:', error);
      showToast('Failed to load gallery ready email preview. Please try again later.', 'error');
    } finally {
      setLoadingGalleryReadyPreview(false);
    }
  };

  const handleSendGalleryReadyEmailFromPreview = async () => {
    const sent = await handleSendGalleryReadyEmail();
    if (sent) closeGalleryReadyPreview();
  };

  return {
    agreementId,
    detail,
    loadingDetail,
    openAgreement,
    closeAgreement,
    applyServerAgreement,
    saving,
    setSaving,
    editingContent,
    setEditingContent,
    editSecondSignerEnabled,
    setEditSecondSignerEnabled,
    editSecondSignerFirstName,
    setEditSecondSignerFirstName,
    editSecondSignerLastName,
    setEditSecondSignerLastName,
    editSecondSignerEmail,
    setEditSecondSignerEmail,
    editSecondSignerPhone,
    setEditSecondSignerPhone,
    editRequireBothSignatures,
    setEditRequireBothSignatures,
    paymentStatus,
    setPaymentStatus,
    stripePaymentLink,
    setStripePaymentLink,
    stripeReceiptLink,
    setStripeReceiptLink,
    galleryLinks,
    setGalleryLinks,
    galleryEmailSentAt,
    sendingGalleryEmail,
    showGalleryReadyPreview,
    galleryReadyPreview,
    loadingGalleryReadyPreview,
    nextAction,
    setNextAction,
    selectedBackdropLinkId,
    backdropOptions,
    selectedBackdropName,
    setSelectedBackdropName,
    loadingBackdropOptions,
    attendantId,
    sections,
    setSections,
    trackingTimeline,
    loadingTracking,
    updatingChaserPaused,
    clientNotes,
    loadingClientNotes,
    handleBackdropLinkChange,
    handleSaveBackdropSelection,
    handleClearBackdropSelection,
    handleToggleTrackingSection,
    handleToggleChaserPaused,
    handleToggleClientNotesSection,
    handleSaveAgreement,
    handleUpdatePortalFields,
    handlePreviewGalleryReadyEmail,
    handleSendGalleryReadyEmail,
    handleSendGalleryReadyEmailFromPreview,
    closeGalleryReadyPreview,
  };
}
