'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { UIcon } from './UIcon';

interface FileUploadProps {
  clientId: string;
  eventId?: string | null;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  googleDriveLink: string;
  createdAt: string;
}

export default function FileUpload({ clientId, eventId, onUploadSuccess, onUploadError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const ALLOWED_TYPES = ['application/zip', 'application/x-zip-compressed', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const allowedExtensions = ['.zip', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (!allowedExtensions.includes(extension)) {
        return 'Invalid file type. Only ZIP and image files (JPG, PNG, GIF, WEBP) are allowed.';
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onUploadError?.(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      if (eventId) {
        formData.append('eventId', eventId);
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to parse as JSON, but handle non-JSON responses
        let errorMessage = 'Failed to upload file';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
        } else {
          // Non-JSON response (likely HTML error page)
          const statusText = response.statusText;
          if (response.status === 413) {
            errorMessage = 'File is too large. Maximum size is 10MB.';
          } else if (response.status === 502 || response.status === 503) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = statusText || `Upload failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUploadedFiles(prev => [data.file, ...prev]);
      setUploadProgress(100);
      onUploadSuccess?.();

      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]); // Only handle first file
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]); // Only handle first file
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This will remove it from Google Drive and cannot be undone.')) {
      return;
    }

    setDeletingFileId(fileId);
    setError(null);

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to delete file';
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            errorMessage = response.statusText || errorMessage;
          }
        } else {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Remove file from the list
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      onUploadSuccess?.(); // Trigger refresh callback if needed
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete file';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setDeletingFileId(null);
    }
  };

  // Fetch existing files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/files/client/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setUploadedFiles(data.files || []);
        }
      } catch (err) {
        // Silently fail - files will show after upload
        console.error('Error fetching files:', err);
      }
    };

    fetchFiles();
  }, [clientId]);

  return (
    <div style={{ width: '100%' }}>
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#4a9e72' : '#cbd5e1'}`,
          borderRadius: '8px',
          padding: isMobile ? '24px 16px' : '32px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.2s',
          marginBottom: '16px',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = '#4a9e72';
            e.currentTarget.style.backgroundColor = '#eff6ff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />
                <UIcon name="upload" style={{ fontSize: isMobile ? '36px' : '48px', marginBottom: '12px', color: '#64748b' }} />
        <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
          {isUploading ? 'Uploading...' : 'Drag and drop files here'}
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#64748b', marginBottom: '12px' }}>
          or click to browse
        </div>
        <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#94a3b8' }}>
          ZIP, JPG, PNG, GIF, WEBP (max 10MB)
        </div>
        {isUploading && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#4a9e72',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
            Uploaded Files:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <UIcon name={getFileIconName(file.fileType)} style={{ fontSize: '24px', color: '#1e293b' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.fileName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {formatFileSize(file.fileSize)}
                  </div>
                </div>
                <a
                  href={file.googleDriveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: isMobile ? '8px 12px' : '6px 12px',
                    backgroundColor: '#4a9e72',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '12px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3d8560';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#4a9e72';
                  }}
                >
                  Open
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id);
                  }}
                  disabled={deletingFileId === file.id}
                  style={{
                    padding: isMobile ? '8px 12px' : '6px 12px',
                    backgroundColor: deletingFileId === file.id ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '12px',
                    fontWeight: '500',
                    cursor: deletingFileId === file.id ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (deletingFileId !== file.id) {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (deletingFileId !== file.id) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }
                  }}
                  title="Delete file from Google Drive"
                >
                  {deletingFileId === file.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

