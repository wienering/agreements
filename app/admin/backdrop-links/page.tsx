'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminButton } from '../../components/AdminButton';
import { AdminMobileDataCard, AdminMobileField } from '../../components/AdminMobileDataCard';
import { UIcon } from '../../components/UIcon';

interface BackdropLink {
  id: string;
  name: string;
  url: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function BackdropLinksPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Backdrop Links | Admin | Photobooth Guys';
  }, []);

  const [backdropLinks, setBackdropLinks] = useState<BackdropLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<BackdropLink | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', displayOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const router = useRouter();

  const mainBg = 'var(--admin-bg)';
  const cardBg = 'var(--admin-surface)';
  const textColor = 'var(--admin-text)';
  const mutedText = 'var(--admin-muted)';
  const borderColor = 'var(--admin-hairline)';

  useEffect(() => {
    fetchBackdropLinks();
  }, []);

  const fetchBackdropLinks = async () => {
    try {
      const response = await adminFetch('/api/agreements/backdrop-links');
      if (response.ok) {
        const data = await response.json();
        setBackdropLinks(data.backdropLinks || []);
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

      const response = await adminFetch(url, {
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
      const response = await adminFetch(`/api/agreements/backdrop-links/${id}`, {
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

  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(`${id}:url`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  const extractAttendantIdFromUrl = (url: string): string | null => {
    try {
      // Try to extract from path like /select/[attendantId]
      const pathMatch = url.match(/\/select\/([^/?]+)/);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
      
      // Try to extract from query parameter
      const urlObj = new URL(url);
      const attendantIdParam = urlObj.searchParams.get('attendantId');
      if (attendantIdParam) {
        return attendantIdParam;
      }
      
      // Try to extract from path segments
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      const selectIndex = pathSegments.indexOf('select');
      if (selectIndex !== -1 && pathSegments[selectIndex + 1]) {
        return pathSegments[selectIndex + 1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting attendant ID from URL:', error);
      return null;
    }
  };

  const getAttendantHubLink = (backdropLinkUrl: string): string | null => {
    const attendantId = extractAttendantIdFromUrl(backdropLinkUrl);
    if (!attendantId) return null;
    return `${window.location.origin}/attendants/${attendantId}/hub`;
  };

  const copyHubLink = async (backdropLinkUrl: string, id: string) => {
    const hubLink = getAttendantHubLink(backdropLinkUrl);
    if (!hubLink) {
      alert('Could not extract attendant ID from backdrop link URL');
      return;
    }
    try {
      await navigator.clipboard.writeText(hubLink);
      setCopiedKey(`${id}:hub`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy hub link:', error);
      alert('Failed to copy hub link to clipboard');
    }
  };

  const renderOrderControls = (link: BackdropLink, index: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => moveLink(link.id, 'up')}
        disabled={index === 0}
        style={{
          backgroundColor: 'transparent',
          border: `1px solid ${borderColor}`,
          borderRadius: '4px',
          cursor: index === 0 ? 'not-allowed' : 'pointer',
          color: index === 0 ? borderColor : mutedText,
          fontSize: '12px',
          padding: '4px 8px',
        }}
      >
        ▲
      </button>
      <span style={{ fontSize: '14px', color: textColor, fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>
        {link.displayOrder}
      </span>
      <button
        onClick={() => moveLink(link.id, 'down')}
        disabled={index === backdropLinks.length - 1}
        style={{
          backgroundColor: 'transparent',
          border: `1px solid ${borderColor}`,
          borderRadius: '4px',
          cursor: index === backdropLinks.length - 1 ? 'not-allowed' : 'pointer',
          color: index === backdropLinks.length - 1 ? borderColor : mutedText,
          fontSize: '12px',
          padding: '4px 8px',
        }}
      >
        ▼
      </button>
    </div>
  );

  const renderAttendantHubCell = (link: BackdropLink) => {
    const hubLink = getAttendantHubLink(link.url);
    if (!hubLink) {
      return <span style={{ color: mutedText, fontSize: '13px' }}>No attendant ID</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        <a
          href={hubLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent)',
            fontSize: '13px',
            textDecoration: 'none',
            fontWeight: '500',
            wordBreak: 'break-all',
          }}
        >
          View Hub →
        </a>
        <AdminButton variant="ghost" size="compact" onClick={() => copyHubLink(link.url, link.id)}>
          {copiedKey === `${link.id}:hub` ? '✓ Copied' : 'Copy Hub Link'}
        </AdminButton>
      </div>
    );
  };

  const renderBackdropActions = (link: BackdropLink) => (
    <>
      <AdminButton variant="ghost" size="compact" onClick={() => copyLink(link.url, link.id)}>
        {copiedKey === `${link.id}:url` ? '✓ Copied' : 'Copy Link'}
      </AdminButton>
      <AdminButton variant="ghost" size="compact" onClick={() => handleEdit(link)}>
        Edit
      </AdminButton>
      <AdminButton variant="danger" size="compact" onClick={() => handleDelete(link.id)}>
        Delete
      </AdminButton>
    </>
  );

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
        adminFetch(`/api/agreements/backdrop-links/${newOrder[currentIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: currentIndex + 1 })
        }),
        adminFetch(`/api/agreements/backdrop-links/${newOrder[newIndex].id}`, {
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
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .header-actions {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: flex-start !important;
          }
          .header-actions button {
            width: 100%;
          }
        }
      `}} />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: mainBg,
        padding: '16px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="header-actions" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
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
            <h1 className="admin-page-title" style={{ 
              margin: '0', 
              fontSize: '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Backdrop Links Management
            </h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p style={{
              margin: '8px 0 0 0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage backdrop selection URLs for client portal
            </p>
          </div>

          <AdminButton variant="primary" onClick={handleAdd}>
            + Add Backdrop Link
          </AdminButton>
        </div>

        {/* Backdrop Links List */}
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
              Loading backdrop links...
            </div>
          ) : backdropLinks.length === 0 ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: mutedText 
            }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', color: mutedText }}>
                <UIcon name="camera" style={{ fontSize: '48px' }} />
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: textColor }}>
                No backdrop links yet
              </p>
              <p style={{ margin: '0' }}>
                Click &quot;Add Backdrop Link&quot; to create your first backdrop selection URL
              </p>
            </div>
          ) : (
            <>
              <div className="admin-table-desktop">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: 'var(--admin-bg)',
                      borderBottom: `1px solid ${borderColor}`,
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText, width: '60px' }}>Order</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText, minWidth: '100px' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText, maxWidth: '200px', width: '200px' }}>URL</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: mutedText, width: '180px', minWidth: '180px' }}>Attendant Hub</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: mutedText, width: '280px', minWidth: '280px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backdropLinks.map((link, index) => (
                      <tr
                        key={link.id}
                        style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--admin-surface)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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
                                padding: '2px',
                              }}
                            >
                              ▲
                            </button>
                            <span style={{ fontSize: '14px', color: textColor, textAlign: 'center', fontWeight: '600' }}>
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
                                padding: '2px',
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>{link.name}</div>
                        </td>
                        <td style={{ padding: '16px', maxWidth: '200px', width: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--accent)',
                                fontSize: '14px',
                                textDecoration: 'none',
                                display: 'inline-block',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={link.url}
                            >
                              {link.url.length > 35 ? link.url.substring(0, 35) + '...' : link.url}
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: '16px', width: '180px', minWidth: '180px' }}>{renderAttendantHubCell(link)}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {renderBackdropActions(link)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-table-mobile">
                {backdropLinks.map((link, index) => (
                  <AdminMobileDataCard
                    key={link.id}
                    title={link.name}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textColor={textColor}
                    mutedText={mutedText}
                    actions={renderBackdropActions(link)}
                  >
                    <AdminMobileField label="Order" mutedText={mutedText}>
                      {renderOrderControls(link, index)}
                    </AdminMobileField>
                    <AdminMobileField label="URL" mutedText={mutedText}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', fontSize: '14px', textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {link.url}
                      </a>
                    </AdminMobileField>
                    <AdminMobileField label="Attendant Hub" mutedText={mutedText}>
                      {renderAttendantHubCell(link)}
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
                    backgroundColor: 'var(--admin-bg)',
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
                    backgroundColor: 'var(--admin-bg)',
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
                    backgroundColor: 'var(--admin-bg)',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <AdminButton
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', url: '', displayOrder: 0 });
                  }}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.url}
                >
                  {saving ? 'Saving...' : editingLink ? 'Update' : 'Add'}
                </AdminButton>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

