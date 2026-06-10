'use client';

import { useState, useEffect } from 'react';
import { UIcon } from '../../components/UIcon';

interface File {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  googleDriveLink: string;
  createdAt: string;
}

interface AttendantFilesSectionProps {
  agreementId: string;
  attendantId: string;
}

export default function AttendantFilesSection({ agreementId, attendantId }: AttendantFilesSectionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ attendantId });
        const response = await fetch(`/api/files/agreement/${agreementId}?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }

        const data = await response.json();
        setFiles(data.files || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [agreementId, attendantId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIconName = (fileType: string): string => {
    if (fileType.includes('zip')) return 'box';
    if (fileType.includes('image')) return 'image';
    return 'file';
  };

  if (loading) {
    return (
      <div
        className="attendant-card"
        style={{
          backgroundColor: '#1a1d1a',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #2d3530',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2
          style={{
            margin: '0 0 24px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            paddingBottom: '16px',
            borderBottom: '1px solid #2d3530',
          }}
        >
          Event Files
        </h2>
        <p style={{ margin: '0', color: '#8f9a8f', fontSize: '14px' }}>Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="attendant-card"
        style={{
          backgroundColor: '#1a1d1a',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #2d3530',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2
          style={{
            margin: '0 0 24px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            paddingBottom: '16px',
            borderBottom: '1px solid #2d3530',
          }}
        >
          Event Files
        </h2>
        <p style={{ margin: '0', color: '#ef4444', fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      className="attendant-card"
      style={{
        backgroundColor: '#1a1d1a',
        padding: '32px',
        borderRadius: '12px',
        border: '1px solid #2d3530',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h2
        style={{
          margin: '0 0 24px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: '#ffffff',
          paddingBottom: '16px',
          borderBottom: '1px solid #2d3530',
        }}
      >
        Event Files
      </h2>
      {files.length === 0 ? (
        <p style={{ margin: '0', color: '#8f9a8f', fontSize: '14px' }}>
          No files have been uploaded for this event.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#080c08',
                border: '1px solid #2d3530',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.backgroundColor = '#1a1d1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2d3530';
                e.currentTarget.style.backgroundColor = '#080c08';
              }}
            >
              <UIcon name={getFileIconName(file.fileType)} style={{ fontSize: '32px', color: '#8f9a8f' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#f1f5f9',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.fileName}
                </div>
                <div style={{ fontSize: '12px', color: '#8f9a8f' }}>
                  {formatFileSize(file.fileSize)}
                </div>
              </div>
              <a
                href={file.googleDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent)';
                }}
              >
                Open in Drive
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

