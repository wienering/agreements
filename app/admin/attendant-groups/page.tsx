'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { AdminButton } from '../../components/AdminButton';
import { AdminMobileDataCard, AdminMobileField } from '../../components/AdminMobileDataCard';
import { UIcon } from '../../components/UIcon';

interface AttendantGroup {
  id: string;
  name: string;
  slug: string;
  attendantIds: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AttendantGroupsPage() {
  useEffect(() => {
    document.title = 'Attendant Hubs | Admin | Photobooth Guys';
  }, []);

  const [groups, setGroups] = useState<AttendantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AttendantGroup | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '', 
    attendantIds: '' 
  });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isDark } = useDarkMode();
  const router = useRouter();

  const mainBg = isDark ? '#080c08' : '#f8fafc';
  const cardBg = isDark ? '#1a1d1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const mutedText = isDark ? '#8f9a8f' : '#64748b';
  const borderColor = isDark ? '#2d3530' : '#e2e8f0';

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await adminFetch('/api/admin/attendant-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching attendant groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingGroup(null);
    setFormData({ name: '', slug: '', attendantIds: '' });
    setShowAddModal(true);
  };

  const handleEdit = (group: AttendantGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      slug: group.slug,
      attendantIds: group.attendantIds.join(', ')
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      const attendantIdsArray = formData.attendantIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      const url = editingGroup
        ? `/api/admin/attendant-groups/${editingGroup.id}`
        : '/api/admin/attendant-groups';
      
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          attendantIds: attendantIdsArray
        })
      });

      if (response.ok) {
        await fetchGroups();
        setShowAddModal(false);
        setFormData({ name: '', slug: '', attendantIds: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save attendant group');
      }
    } catch (error) {
      console.error('Error saving attendant group:', error);
      alert('Failed to save attendant group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendant group?')) {
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/attendant-groups/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete attendant group');
      }
    } catch (error) {
      console.error('Error deleting attendant group:', error);
      alert('Failed to delete attendant group');
    }
  };

  const copyHubLink = async (slug: string, id: string) => {
    const hubLink = `${window.location.origin}/attendants/${slug}/hub`;
    try {
      await navigator.clipboard.writeText(hubLink);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy hub link:', error);
      alert('Failed to copy hub link to clipboard');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingGroup ? prev.slug : generateSlug(name)
    }));
  };

  const renderSlugPill = (slug: string) => (
    <code style={{
      backgroundColor: isDark ? '#080c08' : '#f1f5f9',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '13px',
      color: textColor,
      wordBreak: 'break-all',
    }}>
      {slug}
    </code>
  );

  const renderAttendantIds = (attendantIds: string[]) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {attendantIds.map((id, idx) => (
        <span
          key={idx}
          style={{
            backgroundColor: isDark ? '#2d3530' : '#e2e8f0',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: textColor,
          }}
        >
          {id}
        </span>
      ))}
    </div>
  );

  const renderGroupHubCell = (group: AttendantGroup) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
      <a
        href={`/attendants/${group.slug}/hub`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--accent)',
          fontSize: '13px',
          textDecoration: 'none',
          fontWeight: '500',
        }}
      >
        View Group Hub →
      </a>
      <AdminButton variant="ghost" size="compact" onClick={() => copyHubLink(group.slug, group.id)}>
        {copiedId === group.id ? '✓ Copied' : 'Copy Group Hub Link'}
      </AdminButton>
    </div>
  );

  const renderIndividualHubLinks = (group: AttendantGroup) => {
    if (group.attendantIds.length === 0) {
      return <span style={{ fontSize: '12px', color: mutedText }}>No attendant IDs</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {group.attendantIds.map((attendantId, idx) => {
          const individualHubLink = `${window.location.origin}/attendants/${attendantId}/hub`;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={`/attendants/${attendantId}/hub`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent)',
                  fontSize: '12px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  wordBreak: 'break-all',
                }}
              >
                {attendantId} →
              </a>
              <AdminButton
                variant="ghost"
                size="compact"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(individualHubLink);
                    setCopiedId(`${group.id}-${attendantId}`);
                    setTimeout(() => setCopiedId(null), 2000);
                  } catch (error) {
                    console.error('Failed to copy hub link:', error);
                    alert('Failed to copy hub link to clipboard');
                  }
                }}
              >
                {copiedId === `${group.id}-${attendantId}` ? '✓' : 'Copy'}
              </AdminButton>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGroupActions = (group: AttendantGroup) => (
    <>
      <AdminButton variant="ghost" size="compact" onClick={() => handleEdit(group)}>
        Edit
      </AdminButton>
      <AdminButton variant="danger" size="compact" onClick={() => handleDelete(group.id)}>
        Delete
      </AdminButton>
    </>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg, 
      padding: '32px',
      color: textColor 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px', 
              fontWeight: '700',
              color: textColor 
            }}>
              Attendant Hubs
            </h1>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              color: mutedText 
            }}>
              Manage groups of attendants and their hub links
            </p>
          </div>
          <AdminButton variant="primary" onClick={handleAdd}>
            + Add Attendant Group
          </AdminButton>
        </div>

        {/* Groups List */}
        <div className="table-container" style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: mutedText 
            }}>
              Loading attendant groups...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: mutedText 
            }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', color: mutedText }}>
                <UIcon name="users" style={{ fontSize: '48px' }} />
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: textColor }}>
                No attendant hubs yet
              </p>
              <p style={{ margin: '0' }}>
                Click &quot;Add Attendant Group&quot; to create your first hub
              </p>
            </div>
          ) : (
            <>
              <div className="admin-table-desktop">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: isDark ? '#080c08' : '#f8fafc',
                      borderBottom: `1px solid ${borderColor}`,
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText }}>Slug</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText }}>Attendant IDs</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText }}>Group Hub Link</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText }}>Individual Hub Links</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: mutedText, width: '200px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr
                        key={group.id}
                        style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1a1d1a' : '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>{group.name}</div>
                        </td>
                        <td style={{ padding: '16px' }}>{renderSlugPill(group.slug)}</td>
                        <td style={{ padding: '16px' }}>{renderAttendantIds(group.attendantIds)}</td>
                        <td style={{ padding: '16px' }}>{renderGroupHubCell(group)}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ maxWidth: '300px' }}>{renderIndividualHubLinks(group)}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {renderGroupActions(group)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-table-mobile">
                {groups.map((group) => (
                  <AdminMobileDataCard
                    key={group.id}
                    title={group.name}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textColor={textColor}
                    mutedText={mutedText}
                    actions={renderGroupActions(group)}
                  >
                    <AdminMobileField label="Slug" mutedText={mutedText}>
                      {renderSlugPill(group.slug)}
                    </AdminMobileField>
                    <AdminMobileField label="Attendant IDs" mutedText={mutedText}>
                      {group.attendantIds.length > 0 ? renderAttendantIds(group.attendantIds) : (
                        <span style={{ fontSize: '12px', color: mutedText }}>No attendant IDs</span>
                      )}
                    </AdminMobileField>
                    <AdminMobileField label="Group Hub Link" mutedText={mutedText}>
                      {renderGroupHubCell(group)}
                    </AdminMobileField>
                    <AdminMobileField label="Individual Hub Links" mutedText={mutedText}>
                      {renderIndividualHubLinks(group)}
                    </AdminMobileField>
                  </AdminMobileDataCard>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAddModal(false)}
          >
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{
                margin: '0 0 24px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: textColor
              }}>
                {editingGroup ? 'Edit Attendant Hub' : 'Add Attendant Hub'}
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: textColor
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Husband & Wife Team"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#080c08' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: textColor
                }}>
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., husband-wife-team"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#080c08' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: mutedText
                }}>
                  URL-friendly identifier (auto-generated from name)
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: textColor
                }}>
                  Attendant IDs (comma-separated)
                </label>
                <textarea
                  value={formData.attendantIds}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendantIds: e.target.value }))}
                  placeholder="e.g., attendant1, attendant2, attendant3"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#080c08' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: mutedText
                }}>
                  Enter attendant IDs separated by commas
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <AdminButton variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </AdminButton>
                <AdminButton variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingGroup ? 'Update' : 'Create'}
                </AdminButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

