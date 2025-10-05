'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface PipelineStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  conversionRate?: number;
}

interface DropOff {
  from: string;
  to: string;
  dropOffRate: number;
  count: number;
}

interface PipelineMetrics {
  avgTimeToSign: number;
  overallConversionRate: number;
  activeAgreements: number;
  completedAgreements: number;
}

interface RecentActivity {
  id: string;
  status: string;
  createdAt: string;
  lastEmailedAt?: string;
  signedAt?: string;
  updatedAt: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    title: string;
  };
}

interface PipelineData {
  pipeline: {
    stages: PipelineStage[];
    totalAgreements: number;
    dropOffs: DropOff[];
    metrics: PipelineMetrics;
  };
  recentActivity: RecentActivity[];
  timeRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function PipelinePage() {
  const { isDark } = useDarkMode();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const fetchPipelineData = async (days: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/pipeline?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline data');
      }
      const pipelineData = await response.json();
      setData(pipelineData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData(selectedDays);
  }, [selectedDays]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', { 
      timeZone: 'America/Toronto',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': '#6b7280',
      'LIVE': '#3b82f6',
      'SIGNED': '#10b981',
      'COMPLETED': '#8b5cf6',
      'CANCELLED': '#dc2626'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'DRAFT': '📝',
      'LIVE': '📧',
      'SIGNED': '✅',
      'COMPLETED': '🎉',
      'CANCELLED': '❌'
    };
    return icons[status as keyof typeof icons] || '📄';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: '16px'
          }}>
            Loading pipeline data...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ 
            color: isDark ? '#f1f5f9' : '#1e293b',
            fontSize: '24px',
            margin: '0 0 16px 0'
          }}>
            Error Loading Pipeline
          </h1>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: '16px',
            margin: '0'
          }}>
            {error || 'Failed to load pipeline data'}
          </p>
        </div>
      </div>
    );
  }

  const { pipeline, recentActivity, timeRange } = data;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        padding: '24px 0'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{
                margin: '0 0 8px 0',
                fontSize: '32px',
                fontWeight: '800',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Agreement Pipeline
              </h1>
              <p style={{
                margin: '0',
                fontSize: '16px',
                color: isDark ? '#94a3b8' : '#64748b'
              }}>
                Track agreements through the client journey
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Time Range:
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontSize: '14px'
                }}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '8px'
            }}>
              {pipeline.totalAgreements}
            </div>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: '500'
            }}>
              Total Agreements
            </div>
          </div>
          
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#10b981',
              marginBottom: '8px'
            }}>
              {pipeline.metrics.overallConversionRate.toFixed(1)}%
            </div>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: '500'
            }}>
              Completion Rate
            </div>
          </div>

          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#f59e0b',
              marginBottom: '8px'
            }}>
              {pipeline.metrics.avgTimeToSign}
            </div>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: '500'
            }}>
              Avg Days to Sign
            </div>
          </div>

          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#8b5cf6',
              marginBottom: '8px'
            }}>
              {pipeline.metrics.activeAgreements}
            </div>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: '500'
            }}>
              Active Agreements
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '32px'
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: isDark ? '#f1f5f9' : '#1e293b'
          }}>
            Agreement Funnel
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {pipeline.stages.map((stage, index) => (
              <div key={stage.stage} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: stage.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {stage.count}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }}>
                      {stage.stage}
                    </h3>
                    <div style={{
                      padding: '4px 8px',
                      backgroundColor: stage.color,
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {stage.percentage.toFixed(1)}%
                    </div>
                    {stage.conversionRate && (
                      <div style={{
                        padding: '4px 8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {stage.conversionRate.toFixed(1)}% conversion
                      </div>
                    )}
                  </div>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}>
                    {stage.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '200px',
                  height: '8px',
                  backgroundColor: isDark ? '#334155' : '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: `${stage.percentage}%`,
                    height: '100%',
                    backgroundColor: stage.color,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drop-off Analysis */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '32px'
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: isDark ? '#f1f5f9' : '#1e293b'
          }}>
            Drop-off Analysis
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {pipeline.dropOffs.map((dropOff, index) => (
              <div key={index} style={{
                padding: '20px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <h3 style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isDark ? '#f1f5f9' : '#1e293b'
                  }}>
                    {dropOff.from} → {dropOff.to}
                  </h3>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#dc2626',
                  marginBottom: '4px'
                }}>
                  {dropOff.dropOffRate.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  {dropOff.count} agreements dropped off
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: isDark ? '#f1f5f9' : '#1e293b'
          }}>
            Recent Activity
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {recentActivity.map((activity) => (
              <div key={activity.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <div style={{
                  fontSize: '20px'
                }}>
                  {getStatusIcon(activity.status)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '4px'
                  }}>
                    <h4 style={{
                      margin: '0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }}>
                      {activity.client.firstName} {activity.client.lastName}
                    </h4>
                    <div style={{
                      padding: '2px 8px',
                      backgroundColor: getStatusColor(activity.status),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {activity.status}
                    </div>
                  </div>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}>
                    {activity.template.title}
                  </p>
                </div>
                
                <div style={{
                  textAlign: 'right',
                  fontSize: '12px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  {formatDate(activity.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
