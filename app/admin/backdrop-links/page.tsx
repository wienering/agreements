'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';

interface BackdropLink {
  id: string;
  name: string;
  url: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function BackdropLinksPage() {
  const [backdropLinks, setBackdropLinks] = useState<BackdropLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<BackdropLink | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', displayOrder: 0 });
  const [saving, setSaving] = useState(false);
  const { isDark } = useDarkMode();
  const router = useRouter();

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    fetchBackdropLinks();
  }, []);

  const fetchBackdropLinks = async () => {
    try {
      const response = await fetch('/api/agreements/backdrop-links');
      if (response.ok) {
        const data = await response.json();
        setBackdropLinks(data);
      }
    } catch (error) {
      console.error('Error fetching backdrop links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLink(null);
    setFormData({ 
      name: '', 
      url: '', 
      displayOrder: backdropLinks.length + 1 
    });
    setShowAddModal(true);
  };

  const handleEdit = (link: BackdropLink) => {
    setEditingLink(link);
    setFormData({
      name: link.name,
      url: link.url,
      displayOrder: link.displayOrder
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingLink
        ? `/api/agreements/backdrop-links/${editingLink.id}`
        : '/api/agreements/backdrop-links';
      
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchBackdropLinks();
        setShowAddModal(false);
        setFormData({ name: '', url: '', displayOrder: 0 });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save backdrop link');
      }
    } catch (error) {
      console.error('Error saving backdrop link:', error);
      alert('Failed to save backdrop link');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backdrop link?')) return;

    try {
      const response = await fetch(`/api/agreements/backdrop-links/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchBackdropLinks();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete backdrop link');
      }
    } catch (error) {
      console.error('Error deleting backdrop link:', error);
      alert('Failed to delete backdrop link');
    }
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = backdropLinks.findIndex(link => link.id === id);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === backdropLinks.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newOrder = [...backdropLinks];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    // Update display order for both links
    try {
      await Promise.all([
        fetch(`/api/agreements/backdrop-links/${newOrder[currentIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: currentIndex + 1 })
        }),
        fetch(`/api/agreements/backdrop-links/${newOrder[newIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: newIndex + 1 })
        })
      ]);
      
      await fetchBackdropLinks();
    } catch (error) {
      console.error('Error reordering backdrop links:', error);
      alert('Failed to reorder backdrop links');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <button
              onClick={() => router.back()}
              style={{
                backgroundColor: 'transparent',
                color: mutedText,
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ← Back
            </button>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Backdrop Links Management
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage backdrop selection URLs for client portal
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
            + Add Backdrop Link
          </button>
        </div>

        {/* Backdrop Links List */}
        <div style={{
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
              Loading backdrop links...
            </div>
          ) : backdropLinks.length === 0 ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: mutedText 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: textColor }}>
                No backdrop links yet
              </p>
              <p style={{ margin: '0' }}>
                Click &quot;Add Backdrop Link&quot; to create your first backdrop selection URL
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
                    color: mutedText,
                    width: '50px'
                  }}>
                    Order
                  </th>
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
                    URL
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
                {backdropLinks.map((link, index) => (
                  <tr key={link.id} style={{ 
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button
                          onClick={() => moveLink(link.id, 'up')}
                          disabled={index === 0}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            color: index === 0 ? borderColor : mutedText,
                            fontSize: '12px',
                            padding: '2px'
                          }}
                        >
                          ▲
                        </button>
                        <span style={{ 
                          fontSize: '14px', 
                          color: textColor,
                          textAlign: 'center',
                          fontWeight: '600'
                        }}>
                          {link.displayOrder}
                        </span>
                        <button
                          onClick={() => moveLink(link.id, 'down')}
                          disabled={index === backdropLinks.length - 1}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: index === backdropLinks.length - 1 ? 'not-allowed' : 'pointer',
                            color: index === backdropLinks.length - 1 ? borderColor : mutedText,
                            fontSize: '12px',
                            padding: '2px'
                          }}
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>
                        {link.name}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#3b82f6', 
                          fontSize: '14px',
                          textDecoration: 'none'
                        }}
                      >
                        {link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}
                      </a>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEdit(link)}
                          style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#d97706';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f59e0b';
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ef4444';
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
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                margin: '0 0 24px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: textColor
              }}>
                {editingLink ? 'Edit Backdrop Link' : 'Add Backdrop Link'}
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor
                }}>
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Backdrops"
                  style={{
                    width: '100%',
                    padding: '10px',
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
                  fontWeight: '500',
                  color: textColor
                }}>
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/backdrops"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor
                }}>
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', url: '', displayOrder: 0 });
                  }}
                  disabled={saving}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: saving ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.url}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: (saving || !formData.name || !formData.url) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: (saving || !formData.name || !formData.url) ? 0.5 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving && formData.name && formData.url) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  {saving ? 'Saving...' : editingLink ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

