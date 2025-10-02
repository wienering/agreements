'use client';

import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function AdminHome() {
  const [showSmartFields, setShowSmartFields] = useState(false);
  const { isDark } = useDarkMode();

  const smartFields = [
    { field: '{{client.firstName}}', description: 'Client first name', example: 'John' },
    { field: '{{client.lastName}}', description: 'Client last name', example: 'Smith' },
    { field: '{{client.email}}', description: 'Client email address', example: 'john.smith@example.com' },
    { field: '{{client.phone}}', description: 'Client phone number', example: '(555) 123-4567' },
    { field: '{{client.eventDate}}', description: 'Event date', example: '2024-06-15' },
    { field: '{{event.type}}', description: 'Type of event', example: 'Wedding Photography' },
    { field: '{{event.location}}', description: 'Event location', example: 'Grand Ballroom, Downtown Hotel' },
    { field: '{{event.startTime}}', description: 'Event start time', example: '2:00 PM' },
    { field: '{{event.duration}}', description: 'Event duration', example: '8 hours' },
    { field: '{{event.package}}', description: 'Package selected', example: 'Premium Package' },
    { field: '{{pricing.basePrice}}', description: 'Base package price', example: '$2,500' },
    { field: '{{pricing.additionalHours}}', description: 'Additional hours rate', example: '$300/hour' },
    { field: '{{pricing.total}}', description: 'Total price', example: '$2,500' },
  ];

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ padding: '24px', backgroundColor: mainBg, minHeight: '100vh', color: textColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: textColor, fontWeight: 'bold' }}>
            Photobooth Guys - Admin Dashboard
          </h1>
          <p style={{ margin: 0, color: mutedText, fontSize: '16px' }}>
            Manage your client agreements and templates
          </p>
        </div>
        <button
          onClick={() => setShowSmartFields(!showSmartFields)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          title="View all available smart fields for templates"
        >
          <span>🔧</span>
          {showSmartFields ? 'Hide' : 'Show'} Smart Fields
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: textColor, fontSize: '16px', fontWeight: '600' }}>Total Clients</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
        </div>
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: textColor, fontSize: '16px', fontWeight: '600' }}>Templates</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
        </div>
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: textColor, fontSize: '16px', fontWeight: '600' }}>Active Agreements</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
        </div>
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: textColor, fontSize: '16px', fontWeight: '600' }}>Signed This Week</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>0</p>
        </div>
      </div>

      {/* Smart Fields Panel */}
      {showSmartFields && (
        <div style={{
          backgroundColor: cardBg,
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: `1px solid ${borderColor}`,
          marginBottom: '32px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor, fontWeight: 'bold' }}>Available Smart Fields</h2>
          <p style={{ margin: '0 0 20px 0', color: mutedText, fontSize: '16px' }}>
            Use these fields in your templates to automatically populate client and event information.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {smartFields.map((field, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <code style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {field.field}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(field.field)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: mutedText
                    }}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: mutedText }}>{field.description}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                  Example: {field.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}