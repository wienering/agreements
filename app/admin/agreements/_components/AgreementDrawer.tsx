'use client';

import type { ReactNode } from 'react';
import { formatActivityAbsoluteTime, formatRelativeTime, getActivityTimelineLabel } from '@/lib/agreementTrackingUi';
import { formatDateTimeToronto } from '@/lib/dates';
import RichTextEditor, { RichTextPreview } from '../../../components/RichTextEditor';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import type { useAgreementDetail } from '../_hooks/useAgreementDetail';
import { formatClientNoteTimestamp } from './noteTime';
import type { Agreement, BackdropLinkOption } from './types';
import { CloseIconButton } from './ModalFrame';
import { UnreadNotesBadge } from './UnreadNotesBadge';
import { fieldClass, smallLabelClass } from './uiClasses';

const SMART_FIELDS = [
  { field: '{{client.firstName}}', label: 'First Name' },
  { field: '{{client.lastName}}', label: 'Last Name' },
  { field: '{{client.fullName}}', label: 'Full Name' },
  { field: '{{client.email}}', label: 'Email' },
  { field: '{{client.phone}}', label: 'Phone' },
  { field: '{{client.eventDate}}', label: 'Event Date' },
  { field: '{{client.notes}}', label: 'Notes' },
  { field: '{{clients.fullNames}}', label: 'Both: Full Names' },
  { field: '{{clients.firstNames}}', label: 'Both: First Names' },
  { field: '{{clients.lastNames}}', label: 'Both: Last Names' },
  { field: '{{secondSigner.firstName}}', label: '2nd: First Name' },
  { field: '{{secondSigner.lastName}}', label: '2nd: Last Name' },
  { field: '{{secondSigner.fullName}}', label: '2nd: Full Name' },
  { field: '{{secondSigner.email}}', label: '2nd: Email' },
  { field: '{{secondSigner.phone}}', label: '2nd: Phone' },
  { field: '{{agreement.date}}', label: 'Agreement Date' },
  { field: '{{agreement.id}}', label: 'Agreement ID' },
];

function Accordion({
  title,
  open,
  onToggle,
  children,
  badge,
  className = 'mt-3',
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className} overflow-hidden rounded border border-admin-hairline bg-admin-surface`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="admin-section-title flex w-full items-center justify-between bg-transparent px-4 py-3 text-left text-[15px] font-semibold text-admin-text"
      >
        <span className="inline-flex items-center gap-2">
          {title}
          {badge}
        </span>
        <span aria-hidden className={`text-xs text-admin-muted motion-safe:transition-transform motion-safe:duration-200 ${open ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

type DetailApi = ReturnType<typeof useAgreementDetail>;

export function AgreementDrawer({
  detailApi,
  backdropLinks,
  onPreviewEmail,
  onSend,
  onOpenAttendant,
  sending,
}: {
  detailApi: DetailApi;
  backdropLinks: BackdropLinkOption[];
  onPreviewEmail: (agreement: Agreement) => void;
  onSend: (agreement: Agreement) => void;
  onOpenAttendant: (agreement: Agreement) => void;
  sending: boolean;
}) {
  const {
    agreementId,
    detail,
    loadingDetail,
    closeAgreement,
    saving,
    editingContent,
    setEditingContent,
    sections,
    setSections,
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
    nextAction,
    setNextAction,
    selectedBackdropLinkId,
    backdropOptions,
    selectedBackdropName,
    setSelectedBackdropName,
    loadingBackdropOptions,
    attendantId,
    trackingTimeline,
    loadingTracking,
    updatingChaserPaused,
    clientNotes,
    loadingClientNotes,
    loadingGalleryReadyPreview,
    sendingGalleryEmail,
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
  } = detailApi;

  if (!agreementId) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[800px] flex-col overflow-y-auto bg-admin-surface p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-xl text-admin-text">Edit Agreement</h2>
          <CloseIconButton onClick={closeAgreement} />
        </div>

        {loadingDetail && !detail ? (
          <p className="m-0 text-sm italic text-admin-muted">Loading agreement...</p>
        ) : detail ? (
          <>
            <Accordion
              className="mt-2"
              title="Agreement Content"
              open={sections.content}
              onToggle={() => setSections((current) => ({ ...current, content: !current.content }))}
            >
              <label className="mb-2 block text-sm font-medium text-admin-text">Agreement Content</label>
              <RichTextEditor value={editingContent} onChange={setEditingContent} placeholder="Enter agreement content here..." />
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-admin-text">Quick Add Smart Fields</label>
                <div className="flex flex-wrap gap-2">
                  {SMART_FIELDS.map((field) => (
                    <button
                      key={field.field}
                      type="button"
                      onClick={() => setEditingContent((prev) => prev + ' ' + field.field)}
                      className="rounded border border-admin-hairline bg-admin-surface px-3 py-1.5 text-xs text-admin-text hover:bg-admin-surface-raised"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-admin-text">Preview</label>
                <RichTextPreview html={editingContent || '<p>Enter content above to see preview...</p>'} />
              </div>
            </Accordion>

            <Accordion
              title="Second Signer"
              open={sections.secondSigner}
              onToggle={() => setSections((current) => ({ ...current, secondSigner: !current.secondSigner }))}
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-admin-text">
                <input
                  type="checkbox"
                  checked={editSecondSignerEnabled}
                  onChange={(event) => setEditSecondSignerEnabled(event.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                Add a second signer
              </label>
              <p className="mb-0 ml-6 mt-1 text-xs text-admin-muted">
                Either email on file will be able to unlock the agreement page to sign.
              </p>
              {editSecondSignerEnabled && (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Second Signer First Name" value={editSecondSignerFirstName} onChange={setEditSecondSignerFirstName} placeholder="First name" />
                    <Field label="Second Signer Last Name" value={editSecondSignerLastName} onChange={setEditSecondSignerLastName} placeholder="Last name" />
                    <Field label="Second Signer Email" value={editSecondSignerEmail} onChange={setEditSecondSignerEmail} placeholder="email@example.com" type="email" required />
                    <Field label="Second Signer Phone" value={editSecondSignerPhone} onChange={setEditSecondSignerPhone} placeholder="(555) 123-4567" type="tel" />
                  </div>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      checked={editRequireBothSignatures}
                      onChange={(event) => setEditRequireBothSignatures(event.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                    />
                    Require both signatures to make agreement binding
                  </label>
                  <p className="mb-0 ml-6 mt-1 text-xs text-admin-muted">
                    When enabled, the agreement only becomes SIGNED after both people have signed.
                  </p>
                </>
              )}
            </Accordion>

            <Accordion
              title="Client Portal Settings"
              open={sections.portal}
              onToggle={() => setSections((current) => ({ ...current, portal: !current.portal }))}
            >
              <label className={smallLabelClass}>Payment Status</label>
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={`${fieldClass} mb-3`}>
                <option value="">Not Set</option>
                <option value="Not paid">Not paid</option>
                <option value="Invoice issued">Invoice issued</option>
                <option value="Deposit paid">Deposit paid</option>
                <option value="Balance due">Balance due</option>
                <option value="Fully paid">Fully paid</option>
              </select>
              <label className={smallLabelClass}>Stripe Payment Link</label>
              <input type="url" value={stripePaymentLink} onChange={(event) => setStripePaymentLink(event.target.value)} className={`${fieldClass} mb-3`} placeholder="https://buy.stripe.com/..." />
              <label className={smallLabelClass}>Stripe Receipt Link</label>
              <input type="url" value={stripeReceiptLink} onChange={(event) => setStripeReceiptLink(event.target.value)} className={`${fieldClass} mb-3`} placeholder="https://stripe.com/receipts/..." />
              <label className={smallLabelClass}>Event Gallery Links</label>
              {galleryLinks.map((link, index) => (
                <div key={index} className="mb-3 rounded border border-admin-hairline bg-admin-bg p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-admin-muted">Gallery {index + 1}</span>
                    {galleryLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = galleryLinks.filter((_, itemIndex) => itemIndex !== index);
                          setGalleryLinks(next.length ? next : [{ title: '', url: '' }]);
                        }}
                        className="px-1.5 py-0.5 text-xs text-alert"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={link.title}
                    placeholder="e.g., Photo Gallery or 360 Gallery"
                    onChange={(event) => {
                      const next = [...galleryLinks];
                      next[index] = { ...next[index], title: event.target.value };
                      setGalleryLinks(next);
                    }}
                    className={`${fieldClass} mb-2`}
                  />
                  <input
                    type="url"
                    value={link.url}
                    placeholder="https://gallery.example.com/event..."
                    onChange={(event) => {
                      const next = [...galleryLinks];
                      next[index] = { ...next[index], url: event.target.value };
                      setGalleryLinks(next);
                    }}
                    className={fieldClass}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setGalleryLinks([...galleryLinks, { title: '', url: '' }])}
                className="mt-1 flex items-center gap-1.5 rounded border border-dashed border-admin-hairline px-3 py-1.5 text-[13px] text-admin-text"
              >
                + Add another gallery
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreviewGalleryReadyEmail}
                  disabled={loadingGalleryReadyPreview}
                  className="flex items-center gap-1.5 rounded border border-admin-hairline bg-admin-surface-raised px-4 py-2 text-[13px] font-medium text-admin-text disabled:cursor-not-allowed"
                >
                  {loadingGalleryReadyPreview ? 'Loading preview...' : (
                    <>
                      <UIcon name="eye" className="text-sm" />
                      Preview
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSendGalleryReadyEmail}
                  disabled={sendingGalleryEmail || !galleryLinks.some((link) => link.url.trim())}
                  className={`flex items-center gap-1.5 rounded border-0 px-4 py-2 text-[13px] font-medium text-accent-on ${
                    sendingGalleryEmail ? 'cursor-not-allowed bg-admin-hairline' : 'cursor-pointer bg-accent'
                  }`}
                >
                  {sendingGalleryEmail ? 'Sending...' : (
                    <>
                      <UIcon name="envelope" className="text-sm" />
                      Send Gallery Ready Email
                    </>
                  )}
                </button>
              </div>
              {galleryEmailSentAt && (
                <div className="mt-2 flex items-center gap-2 rounded border border-admin-hairline bg-admin-surface-raised px-3 py-2.5 text-xs text-admin-text">
                  <UIcon name="check" className="text-base text-success" />
                  <span>
                    <strong>Email sent to client</strong> on{' '}
                    {formatDateTimeToronto(galleryEmailSentAt, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <label className={`${smallLabelClass} mt-3`}>Next Action (displayed to client)</label>
              <input
                type="text"
                value={nextAction}
                maxLength={500}
                placeholder="e.g., Template approval pending..."
                onChange={(event) => setNextAction(event.target.value)}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={handleUpdatePortalFields}
                disabled={saving}
                className={`mt-3 w-full rounded border-0 px-2.5 py-2 text-sm font-medium text-accent-on md:py-2.5 ${
                  saving ? 'cursor-not-allowed bg-admin-hairline' : 'cursor-pointer bg-accent'
                }`}
              >
                {saving ? 'Updating...' : 'Update Portal Settings'}
              </button>
            </Accordion>

            <Accordion
              title="Attendant & Backdrop"
              open={sections.attendant}
              onToggle={() => setSections((current) => ({ ...current, attendant: !current.attendant }))}
            >
              <label className={smallLabelClass}>Attendant</label>
              <select value={selectedBackdropLinkId} onChange={(event) => handleBackdropLinkChange(event.target.value)} className={`${fieldClass} mb-3`}>
                <option value="">No backdrop link</option>
                {backdropLinks.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.name}
                  </option>
                ))}
              </select>
              {selectedBackdropLinkId && attendantId && (
                <div className="mb-3">
                  <label className={smallLabelClass}>Select Backdrop</label>
                  {loadingBackdropOptions ? (
                    <div className="px-3 py-2 text-sm italic text-admin-muted">Loading backdrop options...</div>
                  ) : backdropOptions.length > 0 ? (
                    <>
                      <select
                        value={selectedBackdropName}
                        onChange={(event) => setSelectedBackdropName(event.target.value)}
                        className={`${fieldClass} mb-2`}
                      >
                        <option value="">-- Select a backdrop --</option>
                        <option value="No Backdrop">No Backdrop</option>
                        {backdropOptions.map((backdrop) => (
                          <option key={backdrop.id} value={backdrop.name}>
                            {backdrop.name}
                          </option>
                        ))}
                      </select>
                      {selectedBackdropName && (
                        <button
                          type="button"
                          onClick={handleSaveBackdropSelection}
                          disabled={saving}
                          className={`w-full rounded border-0 px-3 py-2 text-sm font-medium text-accent-on ${
                            saving ? 'cursor-not-allowed bg-admin-hairline' : 'cursor-pointer bg-accent'
                          }`}
                        >
                          {saving ? 'Saving...' : 'Save Backdrop Selection'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm italic text-admin-muted">No backdrop options available for this attendant</div>
                  )}
                  {selectedBackdropName && !loadingBackdropOptions && (
                    <div className="mt-2 flex items-center justify-between rounded border border-admin-hairline bg-admin-surface-raised px-3 py-2 text-[13px] text-admin-text">
                      <span>
                        Current selection: <strong>{selectedBackdropName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearBackdropSelection}
                        disabled={saving}
                        title="Clear backdrop selection"
                        className="ml-2 rounded border border-alert bg-transparent px-2 py-1 text-xs font-medium text-alert disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Accordion>

            <Accordion title="Tracking" open={sections.tracking} onToggle={handleToggleTrackingSection}>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-admin-hairline pb-3">
                <label className={`inline-flex items-center gap-2 text-[13px] text-admin-text ${updatingChaserPaused ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(detail.chaserPaused)}
                    disabled={updatingChaserPaused}
                    onChange={(event) => handleToggleChaserPaused(event.target.checked)}
                  />
                  Pause automatic reminders
                </label>
              </div>
              {detail.chaserPaused && <p className="mb-3 mt-0 text-[13px] italic text-admin-muted">Automatic reminders paused</p>}
              {loadingTracking ? (
                <p className="m-0 text-[13px] italic text-admin-muted">Loading activity...</p>
              ) : trackingTimeline.length === 0 ? (
                <p className="m-0 text-[13px] text-admin-muted">No tracking activity yet.</p>
              ) : (
                <div className="flex flex-col">
                  {trackingTimeline.map((entry, index) => (
                    <div key={entry.id} className={`relative flex gap-3 ${index < trackingTimeline.length - 1 ? 'pb-3.5' : ''}`}>
                      <div className="flex w-3 shrink-0 flex-col items-center">
                        <div
                          className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${
                            entry.fromLegacy
                              ? 'bg-admin-muted'
                              : entry.type === 'SIGNED' || entry.type === 'SIGNED_SECOND'
                                ? 'bg-success'
                                : 'bg-accent'
                          }`}
                        />
                        {index < trackingTimeline.length - 1 && <div className="mt-1 min-h-5 w-0.5 flex-1 bg-admin-hairline" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug text-admin-text">
                          {getActivityTimelineLabel(entry.type, entry.meta)}
                          {entry.fromLegacy && <span className="ml-1.5 text-[11px] font-normal italic text-admin-muted">from records</span>}
                        </div>
                        <div className="mt-0.5 text-xs leading-snug text-admin-muted">
                          {formatActivityAbsoluteTime(entry.createdAt)}
                          {' · '}
                          {formatRelativeTime(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Accordion>

            <Accordion
              title="Client Notes"
              open={sections.clientNotes}
              onToggle={handleToggleClientNotesSection}
              badge={<UnreadNotesBadge count={detail.unreadNotesCount ?? 0} />}
            >
              {loadingClientNotes ? (
                <p className="m-0 text-[13px] italic text-admin-muted">Loading notes...</p>
              ) : clientNotes.length === 0 ? (
                <p className="m-0 text-[13px] text-admin-muted">No notes from this client yet.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {clientNotes.map((note) => (
                    <div key={note.id} className="rounded border border-admin-hairline bg-admin-surface p-3">
                      <p className="m-0 whitespace-pre-wrap text-sm text-admin-text">{note.content}</p>
                      <p className="mb-0 mt-2 text-xs text-admin-muted">{formatClientNoteTimestamp(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Accordion>

            <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-admin-hairline px-1 pt-4 lg:gap-2.5">
              <AdminButton variant="primary" onClick={handleSaveAgreement} disabled={saving} title="Save changes to this agreement" className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none">
                {saving ? 'Saving...' : 'Save Changes'}
              </AdminButton>
              <AdminButton
                variant="ghost"
                title="Open client view in new tab"
                className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none"
                onClick={() => window.open(`${window.location.origin}/agreement/${detail.uniqueToken}`, '_blank')}
              >
                <span className="lg:hidden">Preview</span>
                <span className="hidden lg:inline">Preview Client View</span>
              </AdminButton>
              <AdminButton
                variant="ghost"
                title="View attendant page (event details for staff)"
                className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none"
                onClick={() => onOpenAttendant(detail)}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <UIcon name="users" className="text-sm" />
                  <span className="lg:hidden">Attendant</span>
                  <span className="hidden lg:inline">Attendant View</span>
                </span>
              </AdminButton>
              <AdminButton
                variant="ghost"
                title="View client portal (admin preview)"
                disabled={!detail.client?.email}
                className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none"
                onClick={() => {
                  if (detail.client?.email) {
                    window.open(`${window.location.origin}/portal/admin-preview?email=${encodeURIComponent(detail.client.email)}`, '_blank');
                  } else {
                    alert('Client email not found');
                  }
                }}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <UIcon name="search" className="text-sm" />
                  <span className="lg:hidden">Portal</span>
                  <span className="hidden lg:inline">View Client Portal</span>
                </span>
              </AdminButton>
              <AdminButton
                variant="ghost"
                title="Preview the email that will be sent to the client"
                className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none"
                onClick={() => onPreviewEmail(detail)}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <UIcon name="envelope" className="text-sm" />
                  <span className="lg:hidden">Email</span>
                  <span className="hidden lg:inline">Preview Email</span>
                </span>
              </AdminButton>
              <AdminButton
                variant="ghost"
                title="Send this agreement to the client"
                disabled={sending}
                className="!min-w-0 !flex-[1_1_calc(50%-4px)] lg:!min-w-[140px] lg:!flex-none"
                onClick={() => onSend(detail)}
              >
                {sending ? 'Sending...' : (
                  <>
                    <span className="lg:hidden">Send</span>
                    <span className="hidden lg:inline">Send to Client</span>
                  </>
                )}
              </AdminButton>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-admin-text">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );
}
