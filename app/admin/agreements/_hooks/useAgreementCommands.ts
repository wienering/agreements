'use client';

import { adminFetch } from '@/lib/adminFetch';
import { devLog } from '@/lib/logger';
import { fromTorontoDateTimeLocalInput, toTorontoDateTimeLocalInput } from '@/lib/dates';
import { useState } from 'react';
import type { Agreement, InvoiceResult, InvoiceType } from '../_components/types';
import { normalizePaymentStatus } from '../_components/agreementUtils';
import { getDefaultExpirationDate } from '../_components/agreementUtils';
import { patchAgreement } from './patchAgreement';

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useAgreementCommands({
  agreements,
  replaceAgreement,
  removeAgreement,
  showToast,
  openDetailId,
  applyServerAgreement,
  setPaymentStatus,
  setStripePaymentLink,
  closeAgreement,
}: {
  agreements: Agreement[];
  replaceAgreement: (agreement: Agreement) => void;
  removeAgreement: (id: string) => void;
  showToast: ShowToast;
  openDetailId: string | null;
  applyServerAgreement: (agreement: Agreement) => void;
  setPaymentStatus: (value: string) => void;
  setStripePaymentLink: (value: string) => void;
  closeAgreement: () => void;
}) {
  const [sendingToClient, setSendingToClient] = useState<Record<string, boolean>>({});
  const [sendingReviewRequest, setSendingReviewRequest] = useState<Record<string, boolean>>({});
  const [deletingAgreement, setDeletingAgreement] = useState<Record<string, boolean>>({});
  const [archivingAgreement, setArchivingAgreement] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editingStatusAgreementId, setEditingStatusAgreementId] = useState<string | null>(null);
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [editingAgreementId, setEditingAgreementId] = useState<string | null>(null);
  const [resendExpirationPrompt, setResendExpirationPrompt] = useState<Agreement | null>(null);
  const [showPaymentWarningModal, setShowPaymentWarningModal] = useState(false);
  const [completingAgreement, setCompletingAgreement] = useState<Agreement | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ agreementId: string; status: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingAgreement, setCancellingAgreement] = useState<Agreement | null>(null);
  const [cancellationStep, setCancellationStep] = useState(1);
  const [cancellationReason, setCancellationReason] = useState('');
  const [adminName, setAdminName] = useState('');
  const [cancellationConfirm, setCancellationConfirm] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showReviewRequestModal, setShowReviewRequestModal] = useState(false);
  const [reviewRequestAgreement, setReviewRequestAgreement] = useState<Agreement | null>(null);
  const [reviewRequestUseCalgary, setReviewRequestUseCalgary] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceAgreement, setInvoiceAgreement] = useState<Agreement | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<InvoiceResult | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('default');
  const [customInvoiceAmount, setCustomInvoiceAmount] = useState('');
  const [disableOnlinePayment, setDisableOnlinePayment] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewAgreement, setPreviewAgreement] = useState<Agreement | null>(null);
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false);
  const [copyLinkAgreement, setCopyLinkAgreement] = useState<Agreement | null>(null);
  const [showAttendantModal, setShowAttendantModal] = useState(false);
  const [attendantModalAgreement, setAttendantModalAgreement] = useState<Agreement | null>(null);
  const [updatingPhoneVisibility, setUpdatingPhoneVisibility] = useState(false);
  const [updatingVirtualGreenScreen, setUpdatingVirtualGreenScreen] = useState(false);

  const mergeRow = (id: string, patch: Partial<Agreement>) => {
    const current = agreements.find((agreement) => agreement.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    replaceAgreement(next);
    if (openDetailId === id) applyServerAgreement(next);
  };

  const handlePreviewEmail = (agreement: Agreement) => {
    setPreviewAgreement(agreement);
    setShowEmailPreview(true);
  };

  const handleSendToClient = async (agreement: Agreement) => {
    try {
      setSendingToClient((prev) => ({ ...prev, [agreement.id]: true }));
      const response = await adminFetch('/api/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agreement.id }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.status) mergeRow(agreement.id, { status: data.status });
        showToast(`Agreement sent successfully to ${agreement.client.email}!`);
      } else if (data.fallback) {
        showToast(`Email failed: ${data.error}. ${data.fallback.message}`, 'error');
        try {
          await navigator.clipboard.writeText(data.fallback.clientLink);
          showToast('Fallback link copied to clipboard!', 'info');
        } catch (clipboardError) {
          devLog('Could not copy to clipboard:', clipboardError);
        }
      } else {
        showToast(`Error: ${data.error || 'Failed to send agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error sending agreement:', error);
      showToast('Failed to send agreement. Please try again later.', 'error');
    } finally {
      setSendingToClient((prev) => ({ ...prev, [agreement.id]: false }));
    }
  };

  const sendResendEmail = async (agreement: Agreement) => {
    try {
      setSendingToClient((prev) => ({ ...prev, [agreement.id]: true }));
      const response = await adminFetch('/api/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agreement.id }),
      });
      const data = await response.json();
      if (response.ok) {
        mergeRow(agreement.id, {
          lastEmailedAt: new Date().toISOString(),
          emailSendCount: (agreement.emailSendCount || 0) + 1,
        });
        showToast(`Agreement resent successfully to ${agreement.client.email}! (Send #${(agreement.emailSendCount || 0) + 1})`);
      } else if (data.fallback) {
        showToast(`Email failed: ${data.error}. ${data.fallback.message}`, 'error');
        try {
          await navigator.clipboard.writeText(data.fallback.clientLink);
          showToast('Fallback link copied to clipboard!', 'info');
        } catch (clipboardError) {
          devLog('Could not copy to clipboard:', clipboardError);
        }
      } else {
        showToast(`Error: ${data.error || 'Failed to resend agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error resending agreement:', error);
      showToast('Failed to resend agreement. Please try again later.', 'error');
    } finally {
      setSendingToClient((prev) => ({ ...prev, [agreement.id]: false }));
    }
  };

  const handleResendEmail = async (agreement: Agreement) => {
    if (new Date(agreement.expiresAt) < new Date()) {
      setResendExpirationPrompt(agreement);
      setNewExpirationDate(getDefaultExpirationDate());
      return;
    }
    await sendResendEmail(agreement);
  };

  const handleUpdateExpirationAndResend = async () => {
    if (!resendExpirationPrompt) return;
    if (!newExpirationDate) {
      showToast('Please select a new expiration date', 'error');
      return;
    }
    const expiresAtUtc = fromTorontoDateTimeLocalInput(newExpirationDate);
    if (Number.isNaN(expiresAtUtc.getTime())) {
      showToast('Invalid expiration date — please re-select a date and time', 'error');
      return;
    }
    const agreement = resendExpirationPrompt;
    try {
      setSaving(true);
      const updated = await patchAgreement(agreement.id, { expiresAt: expiresAtUtc.toISOString() });
      replaceAgreement(updated);
      if (openDetailId === agreement.id) applyServerAgreement(updated);
      setResendExpirationPrompt(null);
      setNewExpirationDate('');
      setSaving(false);
      await sendResendEmail({ ...agreement, expiresAt: updated.expiresAt });
    } catch (error) {
      console.error('Error updating expiration date:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update expiration date', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExpiration = async (agreementId: string) => {
    if (!newExpirationDate) {
      showToast('Please select a new expiration date', 'error');
      return;
    }
    const expiresAtUtc = fromTorontoDateTimeLocalInput(newExpirationDate);
    if (Number.isNaN(expiresAtUtc.getTime())) {
      showToast('Invalid expiration date — please re-select a date and time', 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await patchAgreement(agreementId, { expiresAt: expiresAtUtc.toISOString() });
      replaceAgreement(updated);
      if (openDetailId === agreementId) applyServerAgreement(updated);
      setEditingExpiration(false);
      setNewExpirationDate('');
      showToast('Expiration date updated successfully!');
    } catch (error) {
      console.error('Error updating expiration date:', error);
      showToast(error instanceof Error ? `Error: ${error.message}` : 'Failed to update expiration date', 'error');
    } finally {
      setSaving(false);
    }
  };

  const proceedWithStatusUpdate = async (agreementId: string, status: string) => {
    try {
      setSaving(true);
      const updated = await patchAgreement(agreementId, { status });
      replaceAgreement(updated);
      if (openDetailId === agreementId) applyServerAgreement(updated);
      showToast(
        status === 'COMPLETED'
          ? 'Agreement marked as completed! Client still has portal access.'
          : 'Status updated successfully!',
      );
      setEditingStatus(false);
      setNewStatus('');
      setEditingStatusAgreementId(null);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast(error instanceof Error ? `Error: ${error.message}` : 'Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (agreementId: string) => {
    if (!newStatus) {
      showToast('Please select a new status', 'error');
      return;
    }
    if (newStatus === 'COMPLETED') {
      const agreement = agreements.find((item) => item.id === agreementId);
      if (agreement && agreement.paymentStatus?.toLowerCase() !== 'fully paid') {
        setCompletingAgreement(agreement);
        setPendingStatusChange({ agreementId, status: newStatus });
        setShowPaymentWarningModal(true);
        return;
      }
    }
    await proceedWithStatusUpdate(agreementId, newStatus);
  };

  const handleConfirmPaymentWarning = async () => {
    if (!pendingStatusChange) return;
    setShowPaymentWarningModal(false);
    await proceedWithStatusUpdate(pendingStatusChange.agreementId, pendingStatusChange.status);
    setCompletingAgreement(null);
    setPendingStatusChange(null);
  };

  const closePaymentWarning = () => {
    setShowPaymentWarningModal(false);
    setCompletingAgreement(null);
    setPendingStatusChange(null);
  };

  const openStatusEditor = (agreement: Agreement) => {
    setEditingStatus(true);
    setEditingStatusAgreementId(agreement.id);
    setNewStatus(agreement.status);
  };

  const closeStatusEditor = () => {
    setEditingStatus(false);
    setEditingStatusAgreementId(null);
    setNewStatus('');
  };

  const openExpirationEditor = (agreement: Agreement) => {
    setEditingExpiration(true);
    setEditingAgreementId(agreement.id);
    setNewExpirationDate(toTorontoDateTimeLocalInput(agreement.expiresAt));
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to delete this DRAFT agreement? This action cannot be undone and will permanently remove the agreement.')) {
      return;
    }
    setDeletingAgreement((prev) => ({ ...prev, [agreementId]: true }));
    try {
      const response = await adminFetch('/api/agreements/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agreementId }),
      });
      if (response.ok) {
        removeAgreement(agreementId);
        if (openDetailId === agreementId) closeAgreement();
        showToast('Agreement deleted successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to delete agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
      showToast('Failed to delete agreement', 'error');
    } finally {
      setDeletingAgreement((prev) => ({ ...prev, [agreementId]: false }));
    }
  };

  const handleArchiveAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to archive this agreement? It will be moved to the archived section.')) {
      return;
    }
    setArchivingAgreement((prev) => ({ ...prev, [agreementId]: true }));
    try {
      const response = await adminFetch('/api/agreements/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId }),
      });
      if (response.ok) {
        removeAgreement(agreementId);
        if (openDetailId === agreementId) closeAgreement();
        showToast('Agreement archived successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to archive agreement', 'error');
      }
    } catch (error) {
      console.error('Error archiving agreement:', error);
      showToast('Error archiving agreement', 'error');
    } finally {
      setArchivingAgreement((prev) => ({ ...prev, [agreementId]: false }));
    }
  };

  const openCancel = (agreement: Agreement) => {
    if (agreement.status !== 'SIGNED') {
      showToast('Only signed agreements can be cancelled', 'error');
      return;
    }
    setCancellingAgreement(agreement);
    setShowCancelModal(true);
    setCancellationStep(1);
    setCancellationReason('');
    setAdminName('');
    setCancellationConfirm('');
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancellingAgreement(null);
    setCancellationStep(1);
    setCancellationReason('');
    setAdminName('');
    setCancellationConfirm('');
  };

  const handleCancelStep1 = () => {
    if (!cancellationReason.trim()) {
      showToast('Please provide a reason for cancellation', 'error');
      return;
    }
    setCancellationStep(2);
  };
  const handleCancelStep2 = () => {
    if (!adminName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setCancellationStep(3);
  };
  const handleCancelStep3 = () => {
    if (cancellationConfirm !== 'CANCEL AGREEMENT') {
      showToast('Please type "CANCEL AGREEMENT" exactly as shown', 'error');
      return;
    }
    setCancellationStep(4);
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingAgreement) return;
    try {
      setCancelling(true);
      const response = await adminFetch('/api/agreements/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: cancellingAgreement.id,
          cancellationReason,
          adminName,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        removeAgreement(cancellingAgreement.id);
        if (openDetailId === cancellingAgreement.id) closeAgreement();
        showToast('Agreement cancelled and archived successfully! Client has been notified via email.', 'success');
        closeCancelModal();
      } else {
        showToast(`Error: ${data.error || 'Failed to cancel agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error cancelling agreement:', error);
      showToast('Failed to cancel agreement', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendReviewRequest = async (agreement: Agreement, reviewMarket: 'ontario' | 'calgary' = 'ontario') => {
    if (agreement.status === 'CANCELLED' || agreement.cancelledAt) {
      showToast('Review requests can’t be sent for cancelled agreements', 'error');
      return false;
    }
    if (agreement.reviewRequestSentAt) {
      showToast('A review request has already been sent for this agreement', 'error');
      return false;
    }
    if (!agreement.client?.email) {
      showToast('Client email is required to send a review request', 'error');
      return false;
    }
    try {
      setSendingReviewRequest((prev) => ({ ...prev, [agreement.id]: true }));
      const response = await adminFetch('/api/agreements/send-review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agreement.id, reviewMarket }),
      });
      const data = await response.json();
      if (response.ok && data.dryRun) {
        showToast(data.message || 'Dry run: nothing was sent.', 'info');
        return true;
      }
      if (response.ok) {
        const sentAt = data.reviewRequestSentAt || new Date().toISOString();
        mergeRow(agreement.id, { reviewRequestSentAt: sentAt });
        showToast(`Review request sent to ${agreement.client.email}!`);
        return true;
      }
      if (data.fallback?.reviewLink) {
        showToast(`Email failed: ${data.error}. ${data.fallback.message}`, 'error');
        try {
          await navigator.clipboard.writeText(data.fallback.reviewLink);
          showToast('Fallback review link copied to clipboard!', 'info');
        } catch (clipboardError) {
          devLog('Could not copy review link to clipboard:', clipboardError);
        }
      } else {
        showToast(`Error: ${data.error || 'Failed to send review request'}`, 'error');
      }
    } catch (error) {
      console.error('Error sending review request:', error);
      showToast('Failed to send review request. Please try again later.', 'error');
    } finally {
      setSendingReviewRequest((prev) => ({ ...prev, [agreement.id]: false }));
    }
    return false;
  };

  const openReviewRequestModal = (agreement: Agreement) => {
    setReviewRequestUseCalgary(false);
    setReviewRequestAgreement(agreement);
    setShowReviewRequestModal(true);
  };

  const closeReviewRequestModal = () => {
    setShowReviewRequestModal(false);
    setReviewRequestAgreement(null);
    setReviewRequestUseCalgary(false);
  };

  const handleConfirmSendReviewRequest = async () => {
    if (!reviewRequestAgreement) return;
    const ok = await handleSendReviewRequest(
      reviewRequestAgreement,
      reviewRequestUseCalgary ? 'calgary' : 'ontario',
    );
    if (ok) closeReviewRequestModal();
  };

  const openInvoice = (agreement: Agreement) => {
    setInvoiceAgreement(agreement);
    setShowInvoiceModal(true);
    setInvoiceResult(null);
    setInvoiceError(null);
    const normalizedStatus = normalizePaymentStatus(agreement.paymentStatus);
    setInvoiceType(normalizedStatus?.toLowerCase().includes('deposit') ? 'total-minus-deposit' : 'default');
    setCustomInvoiceAmount('');
    setDisableOnlinePayment(false);
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setInvoiceAgreement(null);
    setInvoiceResult(null);
    setInvoiceError(null);
    setCreatingInvoice(false);
    setInvoiceType('default');
    setCustomInvoiceAmount('');
    setDisableOnlinePayment(false);
  };

  const handleConfirmCreateInvoice = async () => {
    if (!invoiceAgreement) return;
    try {
      setCreatingInvoice(true);
      setInvoiceError(null);
      setInvoiceResult(null);
      const requestBody: { agreementId: string; invoiceType: InvoiceType; disableOnlinePayment: boolean; customAmount?: number } = {
        agreementId: invoiceAgreement.id,
        invoiceType,
        disableOnlinePayment,
      };
      if (invoiceType === 'custom-amount' && customInvoiceAmount) {
        const amount = parseFloat(customInvoiceAmount);
        if (isNaN(amount) || amount <= 0) {
          setInvoiceError('Please enter a valid custom amount greater than 0');
          showToast('Please enter a valid custom amount', 'error');
          setCreatingInvoice(false);
          return;
        }
        requestBody.customAmount = amount;
      }
      const response = await adminFetch('/api/agreements/create-stripe-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (response.ok) {
        setInvoiceResult(data);
        showToast(`Successfully created ${data.invoices?.length || 1} invoice(s)!`, 'success');
        const paymentLink = data.invoices?.[0]?.invoiceUrl || '';
        const current = agreements.find((item) => item.id === invoiceAgreement.id);
        if (current) {
          const next = {
            ...current,
            paymentStatus: 'Invoice issued',
            ...(paymentLink ? { stripePaymentLink: paymentLink } : {}),
          };
          replaceAgreement(next);
          if (openDetailId === invoiceAgreement.id) {
            applyServerAgreement(next);
            setPaymentStatus('Invoice issued');
            if (paymentLink) setStripePaymentLink(paymentLink);
          }
        }
      } else {
        setInvoiceError(data.error || data.message || 'Failed to create invoice');
        showToast(`Error: ${data.error || data.message || 'Failed to create invoice'}`, 'error');
      }
    } catch (error: unknown) {
      console.error('Error creating invoice:', error);
      const message = error instanceof Error ? error.message : 'Failed to create invoice';
      setInvoiceError(message);
      showToast('Failed to create invoice', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const patchFlag = async (
    agreement: Agreement,
    body: Record<string, unknown>,
    setBusy: (value: boolean) => void,
  ) => {
    setBusy(true);
    try {
      const updated = await patchAgreement(agreement.id, body);
      replaceAgreement(updated);
      if (openDetailId === agreement.id) applyServerAgreement(updated);
      if (attendantModalAgreement?.id === agreement.id) setAttendantModalAgreement(updated);
      return updated;
    } finally {
      setBusy(false);
    }
  };

  const togglePhoneVisibility = async (agreement: Agreement) => {
    const newValue = !agreement.showPhoneNumberAlways;
    try {
      await patchFlag(agreement, { showPhoneNumberAlways: newValue }, setUpdatingPhoneVisibility);
      showToast(
        newValue
          ? 'Phone number will always be visible'
          : 'Phone number visibility set to default (24 hours before event)',
        'success',
      );
    } catch (error) {
      console.error('Error updating phone visibility:', error);
      showToast('Failed to update phone visibility', 'error');
    }
  };

  const toggleVirtualGreenScreen = async (agreement: Agreement) => {
    const newValue = !agreement.forceVirtualGreenScreen;
    try {
      await patchFlag(agreement, { forceVirtualGreenScreen: newValue }, setUpdatingVirtualGreenScreen);
      showToast(
        newValue
          ? 'Virtual Green Screen will be displayed on attendant page'
          : 'Backdrop selection will behave normally',
        'success',
      );
    } catch (error) {
      console.error('Error updating virtual green screen override:', error);
      showToast('Failed to update virtual green screen override', 'error');
    }
  };

  return {
    sendingToClient,
    sendingReviewRequest,
    deletingAgreement,
    archivingAgreement,
    saving,
    editingStatus,
    newStatus,
    setNewStatus,
    editingStatusAgreementId,
    editingExpiration,
    newExpirationDate,
    setNewExpirationDate,
    editingAgreementId,
    setEditingExpiration,
    setEditingAgreementId,
    resendExpirationPrompt,
    setResendExpirationPrompt,
    showPaymentWarningModal,
    completingAgreement,
    showCancelModal,
    cancellingAgreement,
    cancellationStep,
    setCancellationStep,
    cancellationReason,
    setCancellationReason,
    adminName,
    setAdminName,
    cancellationConfirm,
    setCancellationConfirm,
    cancelling,
    showReviewRequestModal,
    reviewRequestAgreement,
    reviewRequestUseCalgary,
    setReviewRequestUseCalgary,
    showInvoiceModal,
    invoiceAgreement,
    creatingInvoice,
    invoiceResult,
    invoiceError,
    invoiceType,
    setInvoiceType,
    customInvoiceAmount,
    setCustomInvoiceAmount,
    disableOnlinePayment,
    setDisableOnlinePayment,
    showEmailPreview,
    previewAgreement,
    setShowEmailPreview,
    setPreviewAgreement,
    showCopyLinkModal,
    copyLinkAgreement,
    setShowCopyLinkModal,
    setCopyLinkAgreement,
    showAttendantModal,
    attendantModalAgreement,
    setShowAttendantModal,
    setAttendantModalAgreement,
    updatingPhoneVisibility,
    updatingVirtualGreenScreen,
    handlePreviewEmail,
    handleSendToClient,
    handleResendEmail,
    handleUpdateExpirationAndResend,
    handleUpdateExpiration,
    handleUpdateStatus,
    handleConfirmPaymentWarning,
    closePaymentWarning,
    openStatusEditor,
    closeStatusEditor,
    openExpirationEditor,
    handleDeleteAgreement,
    handleArchiveAgreement,
    openCancel,
    closeCancelModal,
    handleCancelStep1,
    handleCancelStep2,
    handleCancelStep3,
    handleConfirmCancellation,
    openReviewRequestModal,
    closeReviewRequestModal,
    handleConfirmSendReviewRequest,
    openInvoice,
    closeInvoiceModal,
    handleConfirmCreateInvoice,
    togglePhoneVisibility,
    toggleVirtualGreenScreen,
  };
}
