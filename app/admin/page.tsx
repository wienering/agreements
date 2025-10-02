'use client';

import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function AdminHome() {
  const [showSmartFields, setShowSmartFields] = useState(false);
  const { isDark } = useDarkMode();

  // Sample agreement data
  const sampleAgreement = {
    client: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      eventDate: '2024-06-15'
    },
    event: {
      type: 'Wedding Photography',
      location: 'Grand Ballroom, Downtown Hotel',
      startTime: '2:00 PM',
      duration: '8 hours',
      package: 'Premium Package'
    },
    pricing: {
      basePrice: '$2,500',
      additionalHours: '$300/hour',
      total: '$2,500'
    }
  };

  const smartFields = [
    { field: '{{client.firstName}}', description: 'Client first name', example: sampleAgreement.client.firstName },
    { field: '{{client.lastName}}', description: 'Client last name', example: sampleAgreement.client.lastName },
    { field: '{{client.email}}', description: 'Client email address', example: sampleAgreement.client.email },
    { field: '{{client.phone}}', description: 'Client phone number', example: sampleAgreement.client.phone },
    { field: '{{client.eventDate}}', description: 'Event date', example: sampleAgreement.client.eventDate },
    { field: '{{event.type}}', description: 'Type of event', example: sampleAgreement.event.type },
    { field: '{{event.location}}', description: 'Event location', example: sampleAgreement.event.location },
    { field: '{{event.startTime}}', description: 'Event start time', example: sampleAgreement.event.startTime },
    { field: '{{event.duration}}', description: 'Event duration', example: sampleAgreement.event.duration },
    { field: '{{event.package}}', description: 'Package selected', example: sampleAgreement.event.package },
    { field: '{{pricing.basePrice}}', description: 'Base package price', example: sampleAgreement.pricing.basePrice },
    { field: '{{pricing.additionalHours}}', description: 'Additional hours rate', example: sampleAgreement.pricing.additionalHours },
    { field: '{{pricing.total}}', description: 'Total price', example: sampleAgreement.pricing.total },
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

      {/* Sample Agreement */}
      <div style={{
        backgroundColor: cardBg,
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor, fontWeight: 'bold' }}>Sample Agreement Preview</h2>
        <p style={{ margin: '0 0 20px 0', color: mutedText, fontSize: '16px' }}>
          This shows how smart fields work in a real agreement template.
        </p>
        
        <div style={{
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          padding: '24px',
          backgroundColor: isDark ? '#0f172a' : '#fafafa',
          fontFamily: 'Georgia, serif',
          lineHeight: '1.6',
          color: textColor
        }}>
          <h1 style={{ textAlign: 'center', margin: '0 0 24px 0', color: textColor }}>
            Photobooth Guys - Photography Services Agreement
          </h1>
          
          <p><strong>Client:</strong> {sampleAgreement.client.firstName} {sampleAgreement.client.lastName}</p>
          <p><strong>Email:</strong> {sampleAgreement.client.email}</p>
          <p><strong>Phone:</strong> {sampleAgreement.client.phone}</p>
          <p><strong>Event Date:</strong> {sampleAgreement.client.eventDate}</p>
          
          <h2 style={{ margin: '24px 0 12px 0', color: textColor }}>Event Details</h2>
          <p><strong>Event Type:</strong> {sampleAgreement.event.type}</p>
          <p><strong>Location:</strong> {sampleAgreement.event.location}</p>
          <p><strong>Start Time:</strong> {sampleAgreement.event.startTime}</p>
          <p><strong>Duration:</strong> {sampleAgreement.event.duration}</p>
          <p><strong>Package:</strong> {sampleAgreement.event.package}</p>
          
          <h2 style={{ margin: '24px 0 12px 0', color: textColor }}>Pricing</h2>
          <p><strong>Base Price:</strong> {sampleAgreement.pricing.basePrice}</p>
          <p><strong>Additional Hours:</strong> {sampleAgreement.pricing.additionalHours}</p>
          <p><strong>Total Amount:</strong> {sampleAgreement.pricing.total}</p>
          
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${borderColor}` }}>
            <p><strong>Client Signature:</strong> _________________________</p>
            <p><strong>Date:</strong> _________________________</p>
          </div>
        </div>
        
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
            💡 <strong>Tip:</strong> This agreement uses smart fields like {`{{client.firstName}}`}, {`{{event.type}}`}, and {`{{pricing.total}}`} 
            that automatically populate with real client data when you create an agreement.
          </p>
        </div>
      </div>
    </div>
  );
}