'use client';

import { adminFetch } from '@/lib/adminFetch';
import { getAgreementViewUrl, getQuoteUrl } from '@/lib/leads/display';
import { foldLeadsByEmail } from '@/lib/leads/dedup';
import {
  getLeadGroup,
  LEAD_GROUP_LABELS,
  LEAD_GROUP_ORDER,
  type LeadGroup,
} from '@/lib/leads/grouping';
import { parseLeadTab } from '@/lib/leads/query';
import {
  countMatchingLeads,
  filterFoldedLeadsBySearch,
  filterLeadsBySearch,
  normalizeSearchQuery,
  type FilteredFoldedLead,
} from '@/lib/leads/search';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminButton } from '../../components/AdminButton';
import { getStatusBadgeStyles } from '../../components/StatusBadge';
import { LeadRow } from './LeadRow';
import type { FoldedLeadRecord, LeadCounts, LeadRecord, LeadTab, ManualArchiveReason } from './types';

const STAGES: { key: string; label: string }[] = [
  { key: 'QUOTE_REQUESTED', label: 'Quote Requested' },
  { key: 'QUOTE_SENT', label: 'Quote Sent' },
  { key: 'AGREEMENT_SENT', label: 'Agreement Sent' },
  { key: 'SIGNED', label: 'Signed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'LOST', label: 'Lost' },
];

const TAB_OPTIONS: { key: LeadTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
];

export default function LeadsPage() {
  useEffect(() => {
    document.title = 'Leads | Admin | Photobooth Guys';
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseLeadTab(searchParams.get('tab'));
  const filterStage = searchParams.get('stage') || '';

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [counts, setCounts] = useState<LeadCounts>({ active: 0, archived: 0, all: 0 });
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [markingContactLeadId, setMarkingContactLeadId] = useState<string | null>(null);
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [createAgreementLead, setCreateAgreementLead] = useState<LeadRecord | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState('');
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);
  const [editLeadForm, setEditLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    eventDate: '',
    eventType: '',
    eventLocation: '',
    quotePackageHours: '',
    quoteTotal: '',
    notes: '',
  });
  const [editLeadError, setEditLeadError] = useState('');
  const [editLeadSaving, setEditLeadSaving] = useState(false);
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    eventDate: '',
    eventType: '',
    eventLocation: '',
    quotePackageHours: '',
    quoteTotal: '',
    notes: '',
  });

  const mainBg = 'var(--admin-bg)';
  const cardBg = 'var(--admin-surface)';
  const textColor = 'var(--admin-text)';
  const mutedText = 'var(--admin-muted)';
  const borderColor = 'var(--admin-hairline)';

  const updateSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `/admin/leads?${query}` : '/admin/leads');
    },
    [router, searchParams],
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (filterStage) params.set('stage', filterStage);
      const res = await adminFetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterStage, tab]);

  useEffect(() => {
    fetchLeads();
    adminFetch('/api/templates')
      .then((response) => (response.ok ? response.json() : []))
      .then((templateList) => setTemplates(templateList));
  }, [fetchLeads]);

  // Handle "/" key to focus search bar
  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      // Only trigger if "/" is pressed and user is not already typing in an input/textarea
      if (event.key === '/' && searchInputRef.current) {
        const target = event.target as HTMLElement;
        const isInputFocused = target.tagName === 'INPUT' ||
                              target.tagName === 'TEXTAREA' ||
                              target.isContentEditable;

        // Don't trigger if user is already typing in an input field
        if (!isInputFocused) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  const foldedLeads = useMemo((): FoldedLeadRecord[] | null => {
    if (tab === 'archived') {
      return null;
    }

    if (tab === 'active') {
      return foldLeadsByEmail(leads);
    }

    const activeLeads = leads.filter((lead) => !lead.archivedAt);
    const archivedLeads = leads.filter((lead) => lead.archivedAt);

    return [
      ...foldLeadsByEmail(activeLeads),
      ...archivedLeads.map((lead) => ({ primary: lead, others: [] as LeadRecord[] })),
    ];
  }, [leads, tab]);

  const filteredFoldedLeads = useMemo((): FilteredFoldedLead<LeadRecord>[] | null => {
    if (!foldedLeads) {
      return null;
    }
    return filterFoldedLeadsBySearch(foldedLeads, searchQuery);
  }, [foldedLeads, searchQuery]);

  const filteredArchivedLeads = useMemo(
    () => filterLeadsBySearch(leads, searchQuery),
    [leads, searchQuery],
  );

  const groupedSections = useMemo(() => {
    if (!filteredFoldedLeads) {
      return null;
    }

    const buckets: Record<LeadGroup, FilteredFoldedLead<LeadRecord>[]> = {
      urgent: [],
      coming_up: [],
      later: [],
      no_date: [],
    };

    for (const item of filteredFoldedLeads) {
      buckets[getLeadGroup(item.folded.primary)].push(item);
    }

    return LEAD_GROUP_ORDER
      .map((group) => ({ group, label: LEAD_GROUP_LABELS[group], rows: buckets[group] }))
      .filter((section) => section.rows.length > 0);
  }, [filteredFoldedLeads]);

  const activeSearchQuery = normalizeSearchQuery(searchQuery);
  const matchingLeadCount = useMemo(
    () => countMatchingLeads(leads, foldedLeads, searchQuery),
    [foldedLeads, leads, searchQuery],
  );

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const setTab = (nextTab: LeadTab) => {
    updateSearchParams((params) => {
      if (nextTab === 'active') {
        params.delete('tab');
      } else {
        params.set('tab', nextTab);
      }
    });
  };

  const setFilterStage = (stage: string) => {
    updateSearchParams((params) => {
      if (stage) params.set('stage', stage);
      else params.delete('stage');
    });
  };

  const handleMarkContacted = async (lead: LeadRecord) => {
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextFollowUp ? { nextFollowUpAt: nextFollowUp } : {}),
      });
      if (res.ok) {
        setNextFollowUp('');
        setMarkingContactLeadId(null);
        fetchLeads();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleArchive = async (lead: LeadRecord, reason: ManualArchiveReason) => {
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) fetchLeads();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestore = async (lead: LeadRecord) => {
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/restore`, {
        method: 'POST',
      });
      if (res.ok) fetchLeads();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteLead = async (lead: LeadRecord) => {
    if (!confirm(`Delete lead ${lead.firstName} ${lead.lastName}? This cannot be undone.`)) return;
    try {
      const res = await adminFetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete lead');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete lead');
    }
  };

  const handleCreateAgreement = async (lead: LeadRecord, templateId: string) => {
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/create-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        const agreement = await res.json();
        setCreateAgreementLead(null);
        router.push(`/admin/agreements?highlight=${agreement.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewLead = (lead: LeadRecord) => {
    if (lead.agreement) {
      router.push(getAgreementViewUrl(lead.agreement.id));
      return;
    }
    router.push(getQuoteUrl(lead));
  };

  const openEditLead = (lead: LeadRecord) => {
    setEditLead(lead);
    setEditLeadForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || '',
      eventDate: lead.eventDate ? toDateOnly(lead.eventDate) : '',
      eventType: lead.eventType || '',
      eventLocation: lead.eventLocation || '',
      quotePackageHours: lead.quotePackageHours != null ? String(lead.quotePackageHours) : '',
      quoteTotal: lead.quoteTotal != null ? String(lead.quoteTotal) : '',
      notes: lead.notes || '',
    });
    setEditLeadError('');
  };

  const handleUpdateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editLead) return;
    setEditLeadError('');
    if (!editLeadForm.firstName.trim() || !editLeadForm.lastName.trim() || !editLeadForm.email.trim()) {
      setEditLeadError('First name, last name, and email are required.');
      return;
    }
    setEditLeadSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: editLeadForm.firstName.trim(),
        lastName: editLeadForm.lastName.trim(),
        email: editLeadForm.email.trim(),
      };
      if (editLeadForm.phone !== undefined) payload.phone = editLeadForm.phone.trim() || null;
      payload.eventDate = editLeadForm.eventDate || null;
      if (editLeadForm.eventType !== undefined) payload.eventType = editLeadForm.eventType.trim() || null;
      if (editLeadForm.eventLocation !== undefined) {
        payload.eventLocation = editLeadForm.eventLocation.trim() || null;
      }
      payload.quotePackageHours = editLeadForm.quotePackageHours
        ? parseInt(editLeadForm.quotePackageHours, 10) || null
        : null;
      payload.quoteTotal = editLeadForm.quoteTotal ? parseFloat(editLeadForm.quoteTotal) || null : null;
      payload.notes = editLeadForm.notes.trim() || null;

      const res = await adminFetch(`/api/leads/${editLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setEditLead(null);
        fetchLeads();
      } else {
        setEditLeadError(data.error || data.details?.[0]?.message || 'Failed to update lead');
      }
    } catch (error) {
      console.error(error);
      setEditLeadError('Failed to update lead');
    } finally {
      setEditLeadSaving(false);
    }
  };

  const handleAddLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddLeadError('');
    if (!newLead.firstName.trim() || !newLead.lastName.trim() || !newLead.email.trim()) {
      setAddLeadError('First name, last name, and email are required.');
      return;
    }
    setAddLeadSaving(true);
    try {
      const payload: Record<string, unknown> = {
        source: 'MANUAL',
        firstName: newLead.firstName.trim(),
        lastName: newLead.lastName.trim(),
        email: newLead.email.trim(),
      };
      if (newLead.phone.trim()) payload.phone = newLead.phone.trim();
      if (newLead.eventDate) payload.eventDate = newLead.eventDate;
      if (newLead.eventType.trim()) payload.eventType = newLead.eventType.trim();
      if (newLead.eventLocation.trim()) payload.eventLocation = newLead.eventLocation.trim();
      if (newLead.quotePackageHours) {
        payload.quotePackageHours = parseInt(newLead.quotePackageHours, 10) || undefined;
      }
      if (newLead.quoteTotal) payload.quoteTotal = parseFloat(newLead.quoteTotal) || undefined;
      if (newLead.notes.trim()) payload.notes = newLead.notes.trim();

      const res = await adminFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddLead(false);
        setNewLead({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          eventDate: '',
          eventType: '',
          eventLocation: '',
          quotePackageHours: '',
          quoteTotal: '',
          notes: '',
        });
        fetchLeads();
      } else {
        setAddLeadError(data.error || data.details?.[0]?.message || 'Failed to add lead');
      }
    } catch (error) {
      console.error(error);
      setAddLeadError('Failed to add lead');
    } finally {
      setAddLeadSaving(false);
    }
  };

  const toDateOnly = (value: Date | string) =>
    new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

  const renderLeadList = (rows: FilteredFoldedLead<LeadRecord>[]) =>
    rows.map(({ folded, forceExpanded }) => (
      <LeadRow
        key={folded.primary.id}
        folded={folded}
        forceExpanded={forceExpanded}
        tab={tab}
        borderColor={borderColor}
        cardBg={cardBg}
        textColor={textColor}
        mutedText={mutedText}
        markingContactLeadId={markingContactLeadId}
        nextFollowUp={nextFollowUp}
        onNextFollowUpChange={setNextFollowUp}
        onSaveMarkContacted={handleMarkContacted}
        onCancelMarkContacted={() => {
          setMarkingContactLeadId(null);
          setNextFollowUp('');
        }}
        onCreateAgreement={setCreateAgreementLead}
        onView={handleViewLead}
        onMarkContacted={(leadRecord) => {
          setMarkingContactLeadId(leadRecord.id);
          setNextFollowUp('');
        }}
        onEdit={openEditLead}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleDeleteLead}
      />
    ));

  const renderArchivedList = (rows: LeadRecord[]) =>
    rows.map((lead) => (
      <LeadRow
        key={lead.id}
        folded={{ primary: lead, others: [] }}
        tab={tab}
        borderColor={borderColor}
        cardBg={cardBg}
        textColor={textColor}
        mutedText={mutedText}
        markingContactLeadId={markingContactLeadId}
        nextFollowUp={nextFollowUp}
        onNextFollowUpChange={setNextFollowUp}
        onSaveMarkContacted={handleMarkContacted}
        onCancelMarkContacted={() => {
          setMarkingContactLeadId(null);
          setNextFollowUp('');
        }}
        onCreateAgreement={setCreateAgreementLead}
        onView={handleViewLead}
        onMarkContacted={(leadRecord) => {
          setMarkingContactLeadId(leadRecord.id);
          setNextFollowUp('');
        }}
        onEdit={openEditLead}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleDeleteLead}
      />
    ));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: mainBg, padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 className="admin-page-title" style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: textColor }}>
              Lead Pipeline
            </h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p style={{ margin: '8px 0 0 0', color: mutedText, fontSize: '14px' }}>
              Track and nurture quote inquiries through to signed agreements
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <AdminButton variant="primary" onClick={() => setShowAddLead(true)}>
              + Add Lead
            </AdminButton>
            <select
              value={filterStage}
              onChange={(event) => setFilterStage(event.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: cardBg,
                color: textColor,
                fontSize: '14px',
              }}
            >
              <option value="">All stages</option>
              {STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {TAB_OPTIONS.map((option) => {
            const isActive = tab === option.key;
            const count = counts[option.key];
            return (
              <AdminButton
                key={option.key}
                size="compact"
                variant="ghost"
                onClick={() => setTab(option.key)}
                style={
                  isActive
                    ? { ...getStatusBadgeStyles('accent'), borderRadius: '6px', fontWeight: 600 }
                    : { ...getStatusBadgeStyles('neutral'), borderRadius: '6px' }
                }
              >
                {option.label} ({count})
              </AdminButton>
            );
          })}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', maxWidth: '420px' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  clearSearch();
                }
              }}
              placeholder="Search name or email"
              aria-label="Search name or email"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                paddingRight: searchQuery ? '40px' : '12px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: mainBg,
                color: textColor,
                fontSize: '14px',
              }}
            />
            {searchQuery && (
              <AdminButton
                variant="ghost"
                size="compact"
                aria-label="Clear search"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '6px',
                  transform: 'translateY(-50%)',
                  minWidth: '28px',
                  padding: '0 6px',
                }}
              >
                ×
              </AdminButton>
            )}
          </div>
          {activeSearchQuery && (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: mutedText }}>
              Showing {matchingLeadCount} of {leads.length}
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: mutedText }}>Loading...</div>
        ) : leads.length === 0 ? (
          <div
            style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              border: `1px solid ${borderColor}`,
              padding: '48px',
              textAlign: 'center',
              color: mutedText,
            }}
          >
            No leads in this view.
          </div>
        ) : activeSearchQuery && matchingLeadCount === 0 ? (
          <div
            style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              border: `1px solid ${borderColor}`,
              padding: '48px',
              textAlign: 'center',
              color: mutedText,
            }}
          >
            No leads match your search.
          </div>
        ) : (
          <div style={{ backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
            {tab === 'archived'
              ? renderArchivedList(filteredArchivedLeads)
              : groupedSections?.map((section) => (
                  <section key={section.group} aria-labelledby={`lead-group-${section.group}`}>
                    <div
                      id={`lead-group-${section.group}`}
                      style={{
                        padding: '12px 16px',
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: 'var(--admin-surface-raised)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: textColor,
                      }}
                    >
                      {section.label}
                    </div>
                    {renderLeadList(section.rows)}
                  </section>
                ))}
          </div>
        )}

        {createAgreementLead && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setCreateAgreementLead(null)}
          >
            <div
              style={{
                backgroundColor: cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                minWidth: '320px',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', color: textColor }}>
                Create agreement for {createAgreementLead.firstName} {createAgreementLead.lastName}
              </h3>
              <select
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: mainBg,
                  color: textColor,
                }}
                onChange={(event) => {
                  const templateId = event.target.value;
                  if (templateId) handleCreateAgreement(createAgreementLead, templateId);
                }}
              >
                <option value="">Select template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <AdminButton variant="ghost" onClick={() => setCreateAgreementLead(null)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        )}

        {showAddLead && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => {
              setShowAddLead(false);
              setAddLeadError('');
            }}
          >
            <div
              style={{
                backgroundColor: cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                width: '100%',
                maxWidth: '480px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px 0', color: textColor }}>Add Lead</h3>
              <form onSubmit={handleAddLead}>
                {addLeadError && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: 'var(--admin-surface-raised)',
                      color: 'var(--alert)',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    {addLeadError}
                  </div>
                )}
                <LeadFormFields
                  form={newLead}
                  setForm={setNewLead}
                  mainBg={mainBg}
                  borderColor={borderColor}
                  textColor={textColor}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowAddLead(false);
                      setAddLeadError('');
                    }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton type="submit" variant="primary" disabled={addLeadSaving}>
                    {addLeadSaving ? 'Adding...' : 'Add Lead'}
                  </AdminButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {editLead && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => {
              setEditLead(null);
              setEditLeadError('');
            }}
          >
            <div
              style={{
                backgroundColor: cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                width: '100%',
                maxWidth: '480px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px 0', color: textColor }}>Edit Lead</h3>
              <form onSubmit={handleUpdateLead}>
                {editLeadError && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: 'var(--admin-surface-raised)',
                      color: 'var(--alert)',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    {editLeadError}
                  </div>
                )}
                <LeadFormFields
                  form={editLeadForm}
                  setForm={setEditLeadForm}
                  mainBg={mainBg}
                  borderColor={borderColor}
                  textColor={textColor}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditLead(null);
                      setEditLeadError('');
                    }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton type="submit" variant="primary" disabled={editLeadSaving}>
                    {editLeadSaving ? 'Saving...' : 'Save Changes'}
                  </AdminButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type LeadFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventDate: string;
  eventType: string;
  eventLocation: string;
  quotePackageHours: string;
  quoteTotal: string;
  notes: string;
};

function LeadFormFields({
  form,
  setForm,
  mainBg,
  borderColor,
  textColor,
}: {
  form: LeadFormState;
  setForm: (value: LeadFormState) => void;
  mainBg: string;
  borderColor: string;
  textColor: string;
}) {
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${borderColor}`,
    backgroundColor: mainBg,
    color: textColor,
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            First name *
          </label>
          <input
            type="text"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            Last name *
          </label>
          <input
            type="text"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            required
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
          Email *
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
          Phone
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            Event date
          </label>
          <input
            type="date"
            value={form.eventDate}
            onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            Event type
          </label>
          <input
            type="text"
            value={form.eventType}
            onChange={(event) => setForm({ ...form, eventType: event.target.value })}
            placeholder="e.g. Wedding, Corporate"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
          Event location
        </label>
        <input
          type="text"
          value={form.eventLocation}
          onChange={(event) => setForm({ ...form, eventLocation: event.target.value })}
          placeholder="Venue or address"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            Quote hours
          </label>
          <input
            type="number"
            min="0"
            value={form.quotePackageHours}
            onChange={(event) => setForm({ ...form, quotePackageHours: event.target.value })}
            placeholder="e.g. 4"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
            Quote total ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.quoteTotal}
            onChange={(event) => setForm({ ...form, quoteTotal: event.target.value })}
            placeholder="e.g. 950"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          rows={3}
          placeholder="Any notes about this lead..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    </>
  );
}
