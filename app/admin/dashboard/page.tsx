'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface AnalyticsData {
  overview: {
    totalAgreements: number;
    totalClients: number;
    totalTemplates: number;
    statusDistribution: Array<{
      status: string;
      count: number;
      color: string;
    }>;
  };
  recentActivity: Array<{
    id: string;
    status: string;
    createdAt: string;
    client: {
      firstName: string;
      lastName: string;
      email: string;
    };
    template: {
      title: string;
    };
  }>;
  monthlyStats: Array<{
    month: string;
    count: number;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    email: string;
    agreementCount: number;
  }>;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useDarkMode();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: mainBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: textColor, fontSize: '16px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: mainBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ color: textColor, fontSize: '24px', marginBottom: '8px' }}>Error</h1>
          <p style={{ color: mutedText, fontSize: '16px' }}>{error || 'Failed to load analytics'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '32px', 
            fontWeight: '700', 
            color: textColor 
          }}>
            Dashboard
          </h1>
          <p style={{ 
            margin: '0', 
            color: mutedText, 
            fontSize: '16px' 
          }}>
            Analytics and insights for your agreement management
          </p>
        </div>

        {/* Overview Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: cardBg,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '24px', 
                marginRight: '12px',
                color: '#3b82f6'
              }}>📄</div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Total Agreements</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: textColor }}>
              {analytics.overview.totalAgreements}
            </div>
          </div>

          <div style={{
            backgroundColor: cardBg,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '24px', 
                marginRight: '12px',
                color: '#059669'
              }}>👥</div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Total Clients</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: textColor }}>
              {analytics.overview.totalClients}
            </div>
          </div>

          <div style={{
            backgroundColor: cardBg,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '24px', 
                marginRight: '12px',
                color: '#7c3aed'
              }}>📋</div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Templates</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: textColor }}>
              {analytics.overview.totalTemplates}
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: cardBg,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: textColor }}>
              Agreement Status Distribution
            </h3>
            <div>
              {analytics.overview.statusDistribution.map((status, index) => (
                <div key={status.status} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: index < analytics.overview.statusDistribution.length - 1 ? `1px solid ${borderColor}` : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: status.color,
                      marginRight: '12px'
                    }}></div>
                    <span style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>
                      {status.status}
                    </span>
                  </div>
                  <div style={{
                    backgroundColor: status.color,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {status.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: cardBg,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: textColor }}>
              Recent Activity
            </h3>
            <div>
              {analytics.recentActivity.slice(0, 5).map((agreement, index) => (
                <div key={agreement.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: index < 4 ? `1px solid ${borderColor}` : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: textColor, fontSize: '14px' }}>
                      {agreement.client.firstName} {agreement.client.lastName}
                    </div>
                    <div style={{ color: mutedText, fontSize: '12px' }}>
                      {agreement.template.title}
                    </div>
                    <div style={{ color: mutedText, fontSize: '11px' }}>
                      {new Date(agreement.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: agreement.status === 'DRAFT' ? '#fef2f2' :
                                    agreement.status === 'LIVE' ? '#f0fdf4' :
                                    agreement.status === 'SIGNED' ? '#eff6ff' :
                                    agreement.status === 'COMPLETED' ? '#faf5ff' : '#f1f5f9',
                    color: agreement.status === 'DRAFT' ? '#dc2626' :
                           agreement.status === 'LIVE' ? '#059669' :
                           agreement.status === 'SIGNED' ? '#2563eb' :
                           agreement.status === 'COMPLETED' ? '#7c3aed' : mutedText,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {agreement.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Clients */}
        <div style={{
          backgroundColor: cardBg,
          padding: '24px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: textColor }}>
            Top Clients by Agreement Count
          </h3>
          <div>
            {analytics.topClients.map((client, index) => (
              <div key={client.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: index < analytics.topClients.length - 1 ? `1px solid ${borderColor}` : 'none'
              }}>
                <div>
                  <div style={{ fontWeight: '500', color: textColor, fontSize: '14px' }}>
                    {client.name}
                  </div>
                  <div style={{ color: mutedText, fontSize: '12px' }}>
                    {client.email}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {client.agreementCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}