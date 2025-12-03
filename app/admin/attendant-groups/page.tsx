'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';

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
    document.title = 'Attendant Groups | Admin | Photobooth Guys';
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

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/attendant-groups');
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

      const response = await fetch(url, {
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
      const response = await fetch(`/api/admin/attendant-groups/${id}`, {
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
              Attendant Groups
            </h1>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              color: mutedText 
            }}>
              Manage groups of attendants who share a single hub
            </p>
          </div>
          <button
            onClick={handleAdd}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            + Add Attendant Group
          </button>
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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: textColor }}>
                No attendant groups yet
              </p>
              <p style={{ margin: '0' }}>
                Click &quot;Add Attendant Group&quot; to create your first group
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderBottom: `1px solid ${borderColor}`
                }}>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: mutedText
                  }}>
                    Name
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: mutedText
                  }}>
                    Slug
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: mutedText
                  }}>
                    Attendant IDs
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: mutedText
                  }}>
                    Hub Link
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'right', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: mutedText,
                    width: '200px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} style={{ 
                    borderBottom: `1px solid ${borderColor}`,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>
                        {group.name}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <code style={{ 
                        backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: textColor
                      }}>
                        {group.slug}
                      </code>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '4px' 
                      }}>
                        {group.attendantIds.map((id, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: isDark ? '#334155' : '#e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: textColor
                            }}
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <a
                          href={`/attendants/${group.slug}/hub`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#10b981',
                            fontSize: '13px',
                            textDecoration: 'none',
                            fontWeight: '500'
                          }}
                        >
                          View Hub →
                        </a>
                        <button
                          onClick={() => copyHubLink(group.slug, group.id)}
                          style={{
                            backgroundColor: copiedId === group.id ? '#10b981' : '#059669',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s',
                            whiteSpace: 'nowrap',
                            width: 'fit-content'
                          }}
                          onMouseEnter={(e) => {
                            if (copiedId !== group.id) {
                              e.currentTarget.style.backgroundColor = '#047857';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedId !== group.id) {
                              e.currentTarget.style.backgroundColor = '#059669';
                            }
                          }}
                        >
                          {copiedId === group.id ? '✓ Copied' : 'Copy Hub Link'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEdit(group)}
                          style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#4b5563';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#6b7280';
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {editingGroup ? 'Edit Attendant Group' : 'Add Attendant Group'}
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
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#6b7280' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  {saving ? 'Saving...' : editingGroup ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

