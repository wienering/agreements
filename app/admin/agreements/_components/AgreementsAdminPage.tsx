'use client';

import { useToast } from '../../../components/Toast';
import { AdminButton } from '../../../components/AdminButton';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AgreementDrawer } from './AgreementDrawer';
import { AgreementsList } from './AgreementsList';
import { AttendantModal } from './AttendantModal';
import { CancelModal } from './CancelModal';
import { CopyLinkModal } from './CopyLinkModal';
import { CreateAgreementModal } from './CreateAgreementModal';
import { ExportCsvModal } from './ExportCsvModal';
import { EmailPreviewModal } from './EmailPreviewModal';
import { ExpirationEditModal } from './ExpirationEditModal';
import { GalleryReadyPreviewModal } from './GalleryReadyPreviewModal';
import { InvoiceModal } from './InvoiceModal';
import { PaymentWarningModal } from './PaymentWarningModal';
import { ResendExpirationModal } from './ResendExpirationModal';
import { ReviewRequestModal } from './ReviewRequestModal';
import type { RowActions } from './AgreementRow';
import { StatusEditModal } from './StatusEditModal';
import { useAgreementCommands } from '../_hooks/useAgreementCommands';
import { useAgreementDetail } from '../_hooks/useAgreementDetail';
import { useAgreementsList } from '../_hooks/useAgreementsList';

export default function AgreementsAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();
  const list = useAgreementsList();
  const detail = useAgreementDetail({
    backdropLinks: list.backdropLinks,
    replaceAgreement: list.replaceAgreement,
    showToast,
  });
  const commands = useAgreementCommands({
    agreements: list.agreements,
    replaceAgreement: list.replaceAgreement,
    removeAgreement: list.removeAgreement,
    showToast,
    openDetailId: detail.agreementId,
    applyServerAgreement: detail.applyServerAgreement,
    setPaymentStatus: detail.setPaymentStatus,
    setStripePaymentLink: detail.setStripePaymentLink,
    closeAgreement: detail.closeAgreement,
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [createInitial, setCreateInitial] = useState({ clientId: '', eventId: '', templateId: '' });

  useEffect(() => {
    document.title = 'Agreements | Admin | Photobooth Guys';
  }, []);

  useEffect(() => {
    const createParam = searchParams.get('create');
    const clientParam = searchParams.get('client');
    const templateIdParam = searchParams.get('templateId');
    if (createParam !== 'true' && !templateIdParam) return;

    if (createParam === 'true' && clientParam) {
      try {
        const clientData = JSON.parse(decodeURIComponent(clientParam));
        let eventId = '';
        const eventParam = searchParams.get('event');
        if (eventParam) {
          try {
            eventId = JSON.parse(decodeURIComponent(eventParam))?.id || '';
          } catch (error) {
            console.error('Error parsing event data from URL:', error);
          }
        }
        setCreateInitial({ clientId: clientData.id, eventId, templateId: '' });
        window.setTimeout(() => setShowCreateForm(true), 100);
        router.replace('/admin/agreements');
      } catch (error) {
        console.error('Error parsing client data from URL:', error);
      }
    } else if (templateIdParam) {
      setCreateInitial({ clientId: '', eventId: '', templateId: templateIdParam });
      window.setTimeout(() => setShowCreateForm(true), 100);
      router.replace('/admin/agreements');
    }
  }, [router, searchParams]);

  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || !list.searchInputRef.current) return;
      const target = event.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInputFocused) {
        event.preventDefault();
        list.searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, [list.searchInputRef]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (commands.showAttendantModal) {
        commands.setShowAttendantModal(false);
        commands.setAttendantModalAgreement(null);
      } else if (detail.showGalleryReadyPreview) {
        detail.closeGalleryReadyPreview();
      } else if (commands.showReviewRequestModal) {
        commands.closeReviewRequestModal();
      } else if (commands.showCopyLinkModal) {
        commands.setShowCopyLinkModal(false);
        commands.setCopyLinkAgreement(null);
      } else if (commands.showEmailPreview) {
        commands.setShowEmailPreview(false);
        commands.setPreviewAgreement(null);
      } else if (commands.showInvoiceModal) {
        commands.closeInvoiceModal();
      } else if (commands.showCancelModal) {
        commands.closeCancelModal();
      } else if (commands.showPaymentWarningModal) {
        commands.closePaymentWarning();
      } else if (commands.editingStatus) {
        commands.closeStatusEditor();
      } else if (commands.editingExpiration) {
        commands.setEditingExpiration(false);
        commands.setEditingAgreementId(null);
        commands.setNewExpirationDate('');
      } else if (commands.resendExpirationPrompt) {
        commands.setResendExpirationPrompt(null);
        commands.setNewExpirationDate('');
      } else if (showExport) {
        setShowExport(false);
      } else if (showCreateForm) {
        setShowCreateForm(false);
      } else if (detail.agreementId) {
        detail.closeAgreement();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  });

  const overlayOpen =
    showCreateForm ||
    showExport ||
    commands.editingStatus ||
    commands.editingExpiration ||
    Boolean(commands.resendExpirationPrompt) ||
    Boolean(detail.agreementId && !commands.showAttendantModal && !commands.showCopyLinkModal) ||
    Boolean(commands.showCopyLinkModal && commands.copyLinkAgreement) ||
    Boolean(commands.showCancelModal && commands.cancellingAgreement) ||
    Boolean(commands.showPaymentWarningModal && commands.completingAgreement) ||
    Boolean(commands.showReviewRequestModal && commands.reviewRequestAgreement) ||
    Boolean(commands.showInvoiceModal && commands.invoiceAgreement) ||
    Boolean(commands.showEmailPreview && commands.previewAgreement) ||
    Boolean(detail.showGalleryReadyPreview && detail.galleryReadyPreview) ||
    Boolean(commands.showAttendantModal && (commands.attendantModalAgreement || detail.detail));

  useLockBodyScroll(overlayOpen);

  const actions: RowActions = {
    onEdit: (agreement) => detail.openAgreement(agreement.id),
    onInvoice: commands.openInvoice,
    onView: (agreement) => {
      commands.setCopyLinkAgreement(agreement);
      commands.setShowCopyLinkModal(true);
    },
    onAttendant: (agreement) => {
      commands.setAttendantModalAgreement(agreement);
      commands.setShowAttendantModal(true);
    },
    onResend: commands.handleResendEmail,
    onReview: commands.openReviewRequestModal,
    onSend: commands.handleSendToClient,
    onDelete: commands.handleDeleteAgreement,
    onCancel: commands.openCancel,
    onArchive: commands.handleArchiveAgreement,
    onEditStatus: commands.openStatusEditor,
    onEditExpiry: commands.openExpirationEditor,
    sendingToClient: commands.sendingToClient,
    sendingReviewRequest: commands.sendingReviewRequest,
    deletingAgreement: commands.deletingAgreement,
    archivingAgreement: commands.archivingAgreement,
  };

  const attendantAgreement = commands.attendantModalAgreement
    ? list.agreements.find((agreement) => agreement.id === commands.attendantModalAgreement?.id) ??
      (detail.detail?.id === commands.attendantModalAgreement.id ? detail.detail : commands.attendantModalAgreement)
    : detail.detail && commands.showAttendantModal
      ? detail.detail
      : null;

  return (
    <div className="min-h-screen bg-admin-bg p-4 md:p-6">
      <ToastContainer />
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row md:gap-0">
          <div>
            <h1 className="admin-page-title m-0 text-2xl font-bold text-admin-text md:text-[32px]">Agreements</h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p className="mb-3 mt-2 text-base text-admin-muted">Manage client agreements and contracts</p>
            <AdminButton
              variant="ghost"
              size="compact"
              onClick={() => router.push('/admin/agreements/archived')}
              title="View archived agreements (includes completed and cancelled)"
            >
              Archived
            </AdminButton>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <AdminButton variant="ghost" fullWidth className="md:!w-auto" onClick={() => setShowExport(true)} title="Download agreements as a CSV">
              Export CSV
            </AdminButton>
            <AdminButton variant="primary" fullWidth className="md:!w-auto" onClick={() => setShowCreateForm(true)} title="Create a new agreement">
              + New Agreement
            </AdminButton>
          </div>
        </div>

        <AgreementsList
          searchInputRef={list.searchInputRef}
          searchTerm={list.searchTerm}
          setSearchTerm={list.setSearchTerm}
          statusFilter={list.statusFilter}
          setStatusFilter={list.setStatusFilter}
          attendantFilter={list.attendantFilter}
          conflictsFor={list.getAgreementConflicts}
          doubleBookedCount={list.doubleBookedCount}
          setAttendantFilter={list.setAttendantFilter}
          backdropLinks={list.backdropLinks}
          debouncedSearchTerm={list.debouncedSearchTerm}
          filteredCount={list.filteredAgreements.length}
          activeAgreements={list.activeAgreements}
          completedAgreements={list.completedAgreements}
          paginatedActive={list.paginatedActive}
          paginatedCompleted={list.paginatedCompleted}
          activePage={list.activePage}
          setActivePage={list.setActivePage}
          activeTotalPages={list.activeTotalPages}
          completedPage={list.completedPage}
          setCompletedPage={list.setCompletedPage}
          completedTotalPages={list.completedTotalPages}
          completedExpanded={list.completedExpanded}
          setCompletedExpanded={list.setCompletedExpanded}
          expandedRows={list.expandedRows}
          toggleRow={list.toggleRow}
          warningType={list.getAgreementWarningType}
          actions={actions}
        />
      </div>

      <ExportCsvModal open={showExport} onClose={() => setShowExport(false)} showToast={showToast} />
      <CreateAgreementModal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        clients={list.clients}
        templates={list.templates}
        initial={createInitial}
        onCreated={list.prependAgreement}
        showToast={showToast}
      />
      <AgreementDrawer
        detailApi={detail}
        backdropLinks={list.backdropLinks}
        onPreviewEmail={commands.handlePreviewEmail}
        onSend={commands.handleSendToClient}
        onOpenAttendant={actions.onAttendant}
        sending={Boolean(detail.detail && commands.sendingToClient[detail.detail.id])}
      />
      <StatusEditModal
        open={commands.editingStatus}
        status={commands.newStatus}
        saving={commands.saving}
        onStatusChange={commands.setNewStatus}
        onCancel={commands.closeStatusEditor}
        onUpdate={() => commands.handleUpdateStatus(commands.editingStatusAgreementId || '')}
      />
      <ExpirationEditModal
        open={commands.editingExpiration}
        value={commands.newExpirationDate}
        saving={commands.saving}
        onChange={commands.setNewExpirationDate}
        onCancel={() => {
          commands.setEditingExpiration(false);
          commands.setEditingAgreementId(null);
          commands.setNewExpirationDate('');
        }}
        onUpdate={() => commands.handleUpdateExpiration(commands.editingAgreementId || '')}
      />
      <ResendExpirationModal
        open={Boolean(commands.resendExpirationPrompt)}
        value={commands.newExpirationDate}
        busy={commands.saving || Boolean(commands.resendExpirationPrompt && commands.sendingToClient[commands.resendExpirationPrompt.id])}
        onChange={commands.setNewExpirationDate}
        onCancel={() => {
          commands.setResendExpirationPrompt(null);
          commands.setNewExpirationDate('');
        }}
        onConfirm={commands.handleUpdateExpirationAndResend}
      />
      <CancelModal
        agreement={commands.showCancelModal ? commands.cancellingAgreement : null}
        step={commands.cancellationStep}
        reason={commands.cancellationReason}
        adminName={commands.adminName}
        confirmation={commands.cancellationConfirm}
        cancelling={commands.cancelling}
        onReason={commands.setCancellationReason}
        onAdminName={commands.setAdminName}
        onConfirmation={commands.setCancellationConfirm}
        onStep={commands.setCancellationStep}
        onClose={commands.closeCancelModal}
        onStep1={commands.handleCancelStep1}
        onStep2={commands.handleCancelStep2}
        onStep3={commands.handleCancelStep3}
        onConfirm={commands.handleConfirmCancellation}
      />
      <PaymentWarningModal
        agreement={commands.showPaymentWarningModal ? commands.completingAgreement : null}
        saving={commands.saving}
        onCancel={commands.closePaymentWarning}
        onConfirm={commands.handleConfirmPaymentWarning}
      />
      <ReviewRequestModal
        agreement={commands.showReviewRequestModal ? commands.reviewRequestAgreement : null}
        useCalgary={commands.reviewRequestUseCalgary}
        sending={Boolean(commands.reviewRequestAgreement && commands.sendingReviewRequest[commands.reviewRequestAgreement.id])}
        onToggleCalgary={() => commands.setReviewRequestUseCalgary((value) => !value)}
        onClose={commands.closeReviewRequestModal}
        onSend={commands.handleConfirmSendReviewRequest}
      />
      <InvoiceModal
        agreement={commands.showInvoiceModal ? commands.invoiceAgreement : null}
        creating={commands.creatingInvoice}
        result={commands.invoiceResult}
        error={commands.invoiceError}
        invoiceType={commands.invoiceType}
        customAmount={commands.customInvoiceAmount}
        disableOnlinePayment={commands.disableOnlinePayment}
        onType={commands.setInvoiceType}
        onCustomAmount={commands.setCustomInvoiceAmount}
        onDisableOnline={commands.setDisableOnlinePayment}
        onClose={commands.closeInvoiceModal}
        onCreate={commands.handleConfirmCreateInvoice}
      />
      <EmailPreviewModal
        agreement={commands.showEmailPreview ? commands.previewAgreement : null}
        onClose={() => {
          commands.setShowEmailPreview(false);
          commands.setPreviewAgreement(null);
        }}
        onSend={commands.handleSendToClient}
      />
      <GalleryReadyPreviewModal
        preview={detail.showGalleryReadyPreview ? detail.galleryReadyPreview : null}
        sending={detail.sendingGalleryEmail}
        onClose={detail.closeGalleryReadyPreview}
        onSend={detail.handleSendGalleryReadyEmailFromPreview}
      />
      <AttendantModal
        agreement={commands.showAttendantModal ? attendantAgreement : null}
        updatingPhone={commands.updatingPhoneVisibility}
        updatingGreenScreen={commands.updatingVirtualGreenScreen}
        onClose={() => {
          commands.setShowAttendantModal(false);
          commands.setAttendantModalAgreement(null);
        }}
        onTogglePhone={commands.togglePhoneVisibility}
        onToggleGreenScreen={commands.toggleVirtualGreenScreen}
        showToast={showToast}
      />
      <CopyLinkModal
        agreement={commands.showCopyLinkModal ? commands.copyLinkAgreement : null}
        onClose={() => {
          commands.setShowCopyLinkModal(false);
          commands.setCopyLinkAgreement(null);
        }}
        showToast={showToast}
      />
    </div>
  );
}
