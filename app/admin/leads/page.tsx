'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STAGES: { key: string; label: string }[] = [
  { key: 'QUOTE_REQUESTED', label: 'Quote Requested' },
  { key: 'QUOTE_SENT', label: 'Quote Sent' },
  { key: 'AGREEMENT_SENT', label: 'Agreement Sent' },
  { key: 'SIGNED', label: 'Signed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'LOST', label: 'Lost' },
];

interface Lead {
  id: string;
  source: string;
  stage: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  eventDate?: string;
  eventType?: string;
  eventLocation?: string;
  quotePackageHours?: number;
  quoteTotal?: number;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  contactCount: number;
  createdAt: string;
  notes?: string;
  client?: { id: string; firstName: string; lastName: string; email: string };
  agreement?: { id: string; status: string; uniqueToken: string };
}

export default function LeadsPage() {
  useEffect(() => {
    document.title = 'Leads | Admin | Photobooth Guys';
  }, []);

  const { isDark } = useDarkMode();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [createAgreementLead, setCreateAgreementLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState('');
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
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

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    fetchLeads();
    fetchFollowUp();
    fetch('/api/templates')
      .then((r) => r.ok ? r.json() : [])
      .then((t) => setTemplates(t));
  }, [filterStage]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = filterStage ? `/api/leads?stage=${filterStage}` : '/api/leads';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUp = async () => {
    try {
      const res = await fetch('/api/leads/follow-up');
      if (res.ok) {
        const data = await res.json();
        setFollowUpLeads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkContacted = async (lead: Lead) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextFollowUp ? { nextFollowUpAt: nextFollowUp } : {}),
      });
      if (res.ok) {
        setNextFollowUp('');
        setEditingLead(null);
        fetchLeads();
        fetchFollowUp();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageChange = async (lead: Lead, newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        fetchLeads();
        fetchFollowUp();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Delete lead ${lead.firstName} ${lead.lastName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
        fetchFollowUp();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete lead');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete lead');
    }
  };

  const handleCreateAgreement = async (lead: Lead, templateId: string) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/create-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        const agreement = await res.json();
        setCreateAgreementLead(null);
        router.push(`/admin/agreements?highlight=${agreement.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditLead = (lead: Lead) => {
    setEditLead(lead);
    setEditLeadForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || '',
      eventDate: lead.eventDate ? new Date(lead.eventDate).toISOString().split('T')[0] : '',
      eventType: lead.eventType || '',
      eventLocation: lead.eventLocation || '',
      quotePackageHours: lead.quotePackageHours != null ? String(lead.quotePackageHours) : '',
      quoteTotal: lead.quoteTotal != null ? String(lead.quoteTotal) : '',
      notes: lead.notes || '',
    });
    setEditLeadError('');
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (editLeadForm.eventDate) payload.eventDate = editLeadForm.eventDate;
      else payload.eventDate = null;
      if (editLeadForm.eventType !== undefined) payload.eventType = editLeadForm.eventType.trim() || null;
      if (editLeadForm.eventLocation !== undefined) payload.eventLocation = editLeadForm.eventLocation.trim() || null;
      if (editLeadForm.quotePackageHours) payload.quotePackageHours = parseInt(editLeadForm.quotePackageHours, 10) || null;
      else payload.quotePackageHours = null;
      if (editLeadForm.quoteTotal) payload.quoteTotal = parseFloat(editLeadForm.quoteTotal) || null;
      else payload.quoteTotal = null;
      if (editLeadForm.notes !== undefined) payload.notes = editLeadForm.notes.trim() || null;

      const res = await fetch(`/api/leads/${editLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setEditLead(null);
        fetchLeads();
        fetchFollowUp();
      } else {
        setEditLeadError(data.error || data.details?.[0]?.message || 'Failed to update lead');
      }
    } catch (err) {
      console.error(err);
      setEditLeadError('Failed to update lead');
    } finally {
      setEditLeadSaving(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (newLead.quotePackageHours) payload.quotePackageHours = parseInt(newLead.quotePackageHours, 10) || undefined;
      if (newLead.quoteTotal) payload.quoteTotal = parseFloat(newLead.quoteTotal) || undefined;
      if (newLead.notes.trim()) payload.notes = newLead.notes.trim();

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddLead(false);
        setNewLead({ firstName: '', lastName: '', email: '', phone: '', eventDate: '', eventType: '', eventLocation: '', quotePackageHours: '', quoteTotal: '', notes: '' });
        fetchLeads();
        fetchFollowUp();
      } else {
        setAddLeadError(data.error || data.details?.[0]?.message || 'Failed to add lead');
      }
    } catch (err) {
      console.error(err);
      setAddLeadError('Failed to add lead');
    } finally {
      setAddLeadSaving(false);
    }
  };

  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '-';

  const getQuoteUrl = (lead: Lead) => {
    const params = new URLSearchParams();
    params.set('name', `${lead.firstName} ${lead.lastName}`.trim());
    params.set('email', lead.email);
    if (lead.phone) params.set('phone', lead.phone);
    if (lead.eventDate) params.set('eventDate', new Date(lead.eventDate).toISOString().split('T')[0]);
    return `/admin/quotes?${params.toString()}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: mainBg, padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: textColor }}>
              Lead Pipeline
            </h1>
            <p style={{ margin: 0, color: mutedText, fontSize: '14px' }}>
              Track and nurture quote inquiries through to signed agreements
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowAddLead(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Add Lead
            </button>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
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
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {followUpLeads.length > 0 && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', borderRadius: '12px', border: `1px solid ${isDark ? '#3b82f6' : '#93c5fd'}` }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
              Needs Follow-up ({followUpLeads.length})
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {followUpLeads.slice(0, 8).map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: cardBg,
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontWeight: '600', color: textColor }}>{lead.firstName} {lead.lastName}</span>
                  <span style={{ color: mutedText, fontSize: '13px' }}>{lead.email}</span>
                  <span style={{ fontSize: '12px', color: mutedText }}>{STAGES.find((s) => s.key === lead.stage)?.label}</span>
                  <span style={{ fontSize: '12px', color: mutedText }}>Last: {formatDate(lead.lastContactedAt)}</span>
                  <Link
                    href={`/admin/agreements`}
                    style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none' }}
                  >
                    View
                  </Link>
                  {editingLead?.id === lead.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={nextFollowUp}
                        onChange={(e) => setNextFollowUp(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${borderColor}` }}
                      />
                      <button onClick={() => handleMarkContacted(lead)} style={{ padding: '4px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        Save
                      </button>
                      <button onClick={() => { setEditingLead(null); setNextFollowUp(''); }} style={{ padding: '4px 12px', backgroundColor: mutedText, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={getQuoteUrl(lead)}
                        style={{ padding: '4px 10px', backgroundColor: '#8b5cf6', color: 'white', textDecoration: 'none', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}
                      >
                        Create quote
                      </Link>
                      <button onClick={() => setEditingLead(lead)} style={{ padding: '4px 10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        Mark contacted
                      </button>
                      <button onClick={() => openEditLead(lead)} style={{ padding: '4px 10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: mutedText }}>Loading...</div>
        ) : (
          <div style={{ backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${borderColor}`, backgroundColor: isDark ? '#334155' : '#f1f5f9' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Contact</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Event Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Stage</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Quote</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Last Contacted</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Next Follow-up</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: textColor }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '500', color: textColor }}>{lead.firstName} {lead.lastName}</div>
                        <div style={{ fontSize: '13px', color: mutedText }}>{lead.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: textColor }}>{formatDate(lead.eventDate)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${borderColor}`,
                            backgroundColor: cardBg,
                            color: textColor,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', color: textColor }}>
                        {lead.quoteTotal != null ? `$${lead.quoteTotal}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: mutedText, fontSize: '13px' }}>{formatDate(lead.lastContactedAt)}</td>
                      <td style={{ padding: '12px 16px', color: mutedText, fontSize: '13px' }}>{formatDate(lead.nextFollowUpAt)}</td>
                      <td style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {editingLead?.id === lead.id ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="date"
                              value={nextFollowUp}
                              onChange={(e) => setNextFollowUp(e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${borderColor}` }}
                            />
                            <button onClick={() => handleMarkContacted(lead)} style={{ padding: '4px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                              Save
                            </button>
                            <button onClick={() => { setEditingLead(null); setNextFollowUp(''); }} style={{ padding: '4px 12px', backgroundColor: mutedText, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setEditingLead(lead)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                              Mark contacted
                            </button>
                            {!lead.agreement && lead.stage !== 'LOST' && lead.stage !== 'COMPLETED' && (
                              <button onClick={() => setCreateAgreementLead(lead)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                Create agreement
                              </button>
                            )}
                            {lead.agreement && (
                              <Link
                                href={`/admin/agreements`}
                                style={{ padding: '6px 12px', backgroundColor: '#6366f1', color: 'white', textDecoration: 'none', borderRadius: '6px', fontSize: '13px', display: 'inline-block' }}
                              >
                                View agreement
                              </Link>
                            )}
                            <Link
                              href={getQuoteUrl(lead)}
                              style={{ padding: '6px 12px', backgroundColor: '#8b5cf6', color: 'white', textDecoration: 'none', borderRadius: '6px', fontSize: '13px', display: 'inline-block' }}
                            >
                              Create quote
                            </Link>
                            <button onClick={() => openEditLead(lead)} style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                              Edit
                            </button>
                            <button onClick={() => handleDeleteLead(lead)} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: mutedText }}>
                No leads yet. Generate a quote to create your first lead.
              </div>
            )}
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
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', color: textColor }}>Create agreement for {createAgreementLead.firstName} {createAgreementLead.lastName}</h3>
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
                onChange={(e) => {
                  const tid = e.target.value;
                  if (tid) handleCreateAgreement(createAgreementLead, tid);
                }}
              >
                <option value="">Select template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button onClick={() => setCreateAgreementLead(null)} style={{ padding: '8px 16px', backgroundColor: mutedText, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>
                Cancel
              </button>
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
            onClick={() => { setShowAddLead(false); setAddLeadError(''); }}
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
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px 0', color: textColor }}>Add Lead</h3>
              <form onSubmit={handleAddLead}>
                {addLeadError && (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '14px' }}>
                    {addLeadError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>First name *</label>
                    <input
                      type="text"
                      value={newLead.firstName}
                      onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Last name *</label>
                    <input
                      type="text"
                      value={newLead.lastName}
                      onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Email *</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Phone</label>
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event date</label>
                    <input
                      type="date"
                      value={newLead.eventDate}
                      onChange={(e) => setNewLead({ ...newLead, eventDate: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event type</label>
                    <input
                      type="text"
                      value={newLead.eventType}
                      onChange={(e) => setNewLead({ ...newLead, eventType: e.target.value })}
                      placeholder="e.g. Wedding, Corporate"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event location</label>
                  <input
                    type="text"
                    value={newLead.eventLocation}
                    onChange={(e) => setNewLead({ ...newLead, eventLocation: e.target.value })}
                    placeholder="Venue or address"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Quote hours</label>
                    <input
                      type="number"
                      min="0"
                      value={newLead.quotePackageHours}
                      onChange={(e) => setNewLead({ ...newLead, quotePackageHours: e.target.value })}
                      placeholder="e.g. 4"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Quote total ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newLead.quoteTotal}
                      onChange={(e) => setNewLead({ ...newLead, quoteTotal: e.target.value })}
                      placeholder="e.g. 950"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Notes</label>
                  <textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    rows={3}
                    placeholder="Any notes about this lead..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setShowAddLead(false); setAddLeadError(''); }}
                    style={{ padding: '10px 20px', backgroundColor: mutedText, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLeadSaving}
                    style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: addLeadSaving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', opacity: addLeadSaving ? 0.7 : 1 }}
                  >
                    {addLeadSaving ? 'Adding...' : 'Add Lead'}
                  </button>
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
            onClick={() => { setEditLead(null); setEditLeadError(''); }}
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
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px 0', color: textColor }}>Edit Lead</h3>
              <form onSubmit={handleUpdateLead}>
                {editLeadError && (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '14px' }}>
                    {editLeadError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>First name *</label>
                    <input
                      type="text"
                      value={editLeadForm.firstName}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, firstName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Last name *</label>
                    <input
                      type="text"
                      value={editLeadForm.lastName}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, lastName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Email *</label>
                  <input
                    type="email"
                    value={editLeadForm.email}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Phone</label>
                  <input
                    type="tel"
                    value={editLeadForm.phone}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event date</label>
                    <input
                      type="date"
                      value={editLeadForm.eventDate}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, eventDate: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event type</label>
                    <input
                      type="text"
                      value={editLeadForm.eventType}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, eventType: e.target.value })}
                      placeholder="e.g. Wedding, Corporate"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Event location</label>
                  <input
                    type="text"
                    value={editLeadForm.eventLocation}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, eventLocation: e.target.value })}
                    placeholder="Venue or address"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Quote hours</label>
                    <input
                      type="number"
                      min="0"
                      value={editLeadForm.quotePackageHours}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, quotePackageHours: e.target.value })}
                      placeholder="e.g. 4"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Quote total ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editLeadForm.quoteTotal}
                      onChange={(e) => setEditLeadForm({ ...editLeadForm, quoteTotal: e.target.value })}
                      placeholder="e.g. 950"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: textColor }}>Notes</label>
                  <textarea
                    value={editLeadForm.notes}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Any notes about this lead..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: mainBg, color: textColor, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setEditLead(null); setEditLeadError(''); }}
                    style={{ padding: '10px 20px', backgroundColor: mutedText, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLeadSaving}
                    style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: editLeadSaving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', opacity: editLeadSaving ? 0.7 : 1 }}
                  >
                    {editLeadSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
