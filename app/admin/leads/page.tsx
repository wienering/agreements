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

  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '-';

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
                    <button onClick={() => setEditingLead(lead)} style={{ padding: '4px 10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Mark contacted
                    </button>
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
      </div>
    </div>
  );
}
