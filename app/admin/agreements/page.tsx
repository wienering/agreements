'use client';

import { useState } from 'react';

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    clientId: '',
    templateId: '',
    expiresAt: ''
  });

  const handleCreateAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Create agreement in database
    console.log('Creating agreement:', newAgreement);
    setShowCreateForm(false);
    setNewAgreement({ clientId: '', templateId: '', expiresAt: '' });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1f2937' }}>Agreements</h1>
        <button 
          onClick={() => setShowCreateForm(true)}
          style={{
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          + Create Agreement
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: '#1f2937' }}>Create New Agreement</h2>
          <form onSubmit={handleCreateAgreement}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Select Client *
                </label>
                <select
                  value={newAgreement.clientId}
                  onChange={(e) => setNewAgreement({ ...newAgreement, clientId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Choose a client...</option>
                  {/* TODO: Populate with actual clients */}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Select Template *
                </label>
                <select
                  value={newAgreement.templateId}
                  onChange={(e) => setNewAgreement({ ...newAgreement, templateId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Choose a template...</option>
                  {/* TODO: Populate with actual templates */}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Expiration Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={newAgreement.expiresAt}
                onChange={(e) => setNewAgreement({ ...newAgreement, expiresAt: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                Leave empty for no expiration
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Create Agreement
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>No agreements yet. Create your first agreement to get started.</p>
      </div>
    </div>
  );
}
