'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../../components/Toast';
import Link from 'next/link';
import { formatDateToronto } from '@/lib/dates';

interface ImportResult {
  row: number;
  status: 'imported' | 'updated' | 'skipped' | 'error';
  clientEmail?: string;
  eventDate?: string;
  reason?: string;
  error?: string;
  csvData?: Record<string, string>;
  existingEvent?: any;
}

interface DuplicateEntry {
  row: number;
  csvData: Record<string, string>;
  existingEvent: any;
  matchReason: string;
}

interface ImportResponse {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  details: ImportResult[];
  duplicates: DuplicateEntry[];
}

export default function ImportEventsPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Import Events | Admin | Photobooth Guys';
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResponse | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResults(null);
      } else {
        showToast('Please select a CSV file', 'error');
        e.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      showToast('Please select a CSV file', 'error');
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (startDate) {
        formData.append('startDate', startDate);
      }
      if (endDate) {
        formData.append('endDate', endDate);
      }

      const response = await adminFetch('/api/events/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        showToast(
          `Import completed: ${data.summary.imported} imported, ${data.summary.skipped} skipped, ${data.summary.errors} errors`,
          'success'
        );
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast('Failed to import CSV file', 'error');
    } finally {
      setImporting(false);
    }
  };

  const exportDuplicateReport = () => {
    if (!results || !results.duplicates || results.duplicates.length === 0) {
      showToast('No duplicates to export', 'error');
      return;
    }

    // Create CSV content
    const headers = [
      'Row Number',
      'CSV Email',
      'CSV Event Date',
      'CSV Event Type',
      'CSV Location',
      'CSV Package',
      'CSV Price',
      'Existing Event ID',
      'Existing Event Date',
      'Existing Event Type',
      'Existing Location',
      'Existing Package',
      'Existing Price',
      'Client Name',
      'Match Reason',
    ];

    const rows = results.duplicates.map(dup => {
      const csvData = dup.csvData;
      const existing = dup.existingEvent;
      
      return [
        dup.row.toString(),
        csvData.email || csvData.Email || csvData['Customer Email'] || '',
        csvData['Event Date'] || csvData['Booking Date'] || csvData.date || '',
        csvData['Event Type'] || csvData.Service || csvData.type || '',
        csvData.Location || csvData['Event Location'] || '',
        csvData.Package || csvData['Event Package'] || '',
        csvData.Price || csvData['Package Price'] || '',
        existing.id || '',
        existing.eventDate || '',
        existing.eventType || '',
        existing.eventLocation || '',
        existing.eventPackage || '',
        existing.packagePrice || '',
        `${existing.client?.firstName || ''} ${existing.client?.lastName || ''}`.trim() || existing.client?.email || '',
        dup.matchReason || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `duplicate-events-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Duplicate report exported', 'success');
  };

  const bgColor = 'bg-admin-bg';
  const textColor = 'text-admin-text';
  const borderColor = 'border-admin-border';
  const inputBg = 'bg-admin-surface';
  const cardBg = 'bg-admin-surface';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} p-4 md:p-8`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="admin-page-title text-3xl font-bold text-admin-text">Import Events from CSV</h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <Link
              href="/admin/clients"
              className="px-4 py-2 rounded-lg bg-admin-surface-raised text-admin-text hover:bg-admin-hairline transition-colors"
            >
              Back to Clients
            </Link>
          </div>
          <p className={`${'text-admin-muted'}`}>
            Upload a CSV file exported from Bookly to import events. Duplicate events (same client email and event date) will be skipped.
          </p>
        </div>

        {/* Upload Section */}
        <div className={`${cardBg} rounded-lg p-6 mb-6 ${borderColor} border`}>
          <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${'text-admin-text'}`}>
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className={`block w-full text-sm ${'text-admin-text'} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${
                  'file:bg-admin-surface-raised file:text-admin-text hover:file:bg-admin-hairline'
                }`}
                disabled={importing}
              />
              {file && (
                <p className={`mt-2 text-sm ${'text-admin-muted'}`}>
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${'text-admin-text'}`}>
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg ${inputBg} ${borderColor} border ${textColor}`}
                  disabled={importing}
                />
                <p className={`mt-1 text-xs ${'text-admin-muted'}`}>
                  Only import events on or after this date
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${'text-admin-text'}`}>
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg ${inputBg} ${borderColor} border ${textColor}`}
                  disabled={importing}
                />
                <p className={`mt-1 text-xs ${'text-admin-muted'}`}>
                  Only import events on or before this date
                </p>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={!file || importing}
              className={`w-full md:w-auto px-6 py-3 rounded-lg font-semibold transition-colors ${!file || importing ? 'bg-admin-hairline text-admin-muted cursor-not-allowed' : 'bg-gold text-[#2A2724] hover:brightness-95'}`}
            >
              {importing ? 'Importing...' : 'Import Events'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className={`${cardBg} rounded-lg p-6 ${borderColor} border`}>
              <h2 className="text-xl font-semibold mb-4">Import Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`${bgColor} rounded-lg p-4 ${borderColor} border`}>
                  <div className={`text-sm ${'text-admin-muted'}`}>Total Rows</div>
                  <div className="text-2xl font-bold mt-1">{results.summary.total}</div>
                </div>
                <div className={`${bgColor} rounded-lg p-4 ${borderColor} border`}>
                  <div className={`text-sm ${'text-admin-muted'}`}>Imported</div>
                  <div className="text-2xl font-bold mt-1 text-success">{results.summary.imported}</div>
                </div>
                <div className={`${bgColor} rounded-lg p-4 ${borderColor} border`}>
                  <div className={`text-sm ${'text-admin-muted'}`}>Skipped</div>
                  <div className="text-2xl font-bold mt-1 text-warn">{results.summary.skipped}</div>
                </div>
                <div className={`${bgColor} rounded-lg p-4 ${borderColor} border`}>
                  <div className={`text-sm ${'text-admin-muted'}`}>Errors</div>
                  <div className="text-2xl font-bold mt-1 text-alert">{results.summary.errors}</div>
                </div>
              </div>
            </div>

            {/* Updated/Duplicates Section */}
            {results.duplicates && results.duplicates.length > 0 && (
              <div className={`${cardBg} rounded-lg p-6 ${borderColor} border`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Updated Events ({results.duplicates.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportDuplicateReport}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    'bg-admin-surface-raised text-admin-text hover:bg-admin-hairline'
                  }`}
                >
                  Export Report
                </button>
                <button
                  onClick={() => setShowDuplicates(!showDuplicates)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    'bg-admin-surface-raised text-admin-text hover:bg-admin-hairline'
                  }`}
                >
                  {showDuplicates ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>
            
            <p className={`text-sm mb-4 ${'text-admin-muted'}`}>
              These events already existed (same client email and event date) and were updated with data from the CSV.
              Review the comparison below to see what changed.
            </p>

            {showDuplicates && (
              <div className="space-y-4 mt-4">
                {results.duplicates.map((dup, index) => (
                  <div
                    key={index}
                    className={`${bgColor} rounded-lg p-4 ${borderColor} border`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Row {dup.row}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        'bg-yellow-900 text-yellow-200'
                      }`}>
                        Duplicate
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CSV Data */}
                      <div>
                        <h4 className={`font-medium mb-2 ${'text-admin-text'}`}>
                          CSV Data (Import File)
                        </h4>
                        <div className={`${cardBg} rounded p-3 space-y-1 text-sm`}>
                          <div><span className={'text-admin-muted'}>Email:</span> {dup.csvData.email || dup.csvData.Email || dup.csvData['Customer Email'] || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Event Date:</span> {dup.csvData['Event Date'] || dup.csvData['Booking Date'] || dup.csvData.date || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Event Type:</span> {dup.csvData['Event Type'] || dup.csvData.Service || dup.csvData.type || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Location:</span> {dup.csvData.Location || dup.csvData['Event Location'] || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Package:</span> {dup.csvData.Package || dup.csvData['Event Package'] || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Price:</span> {dup.csvData.Price || dup.csvData['Package Price'] || 'N/A'}</div>
                        </div>
                      </div>
                      
                      {/* Existing Event */}
                      <div>
                        <h4 className={`font-medium mb-2 ${'text-admin-text'}`}>
                          Existing Event (Database)
                        </h4>
                        <div className={`${cardBg} rounded p-3 space-y-1 text-sm`}>
                          <div><span className={'text-admin-muted'}>Event ID:</span> {dup.existingEvent.id}</div>
                          <div><span className={'text-admin-muted'}>Client:</span> {dup.existingEvent.client ? `${dup.existingEvent.client.firstName} ${dup.existingEvent.client.lastName}`.trim() || dup.existingEvent.client.email : 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Event Date:</span> {dup.existingEvent.eventDate ? formatDateToronto(dup.existingEvent.eventDate) : 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Event Type:</span> {dup.existingEvent.eventType || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Location:</span> {dup.existingEvent.eventLocation || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Package:</span> {dup.existingEvent.eventPackage || 'N/A'}</div>
                          <div><span className={'text-admin-muted'}>Price:</span> {dup.existingEvent.packagePrice || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`mt-3 pt-3 ${borderColor} border-t`}>
                      <p className={`text-xs ${'text-admin-muted'}`}>
                        <strong>Match Reason:</strong> {dup.matchReason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            )}

            {/* Errors Section */}
            {results.summary.errors > 0 && (
              <div className={`${cardBg} rounded-lg p-6 ${borderColor} border`}>
                <h2 className="text-xl font-semibold mb-4 text-alert">Errors ({results.summary.errors})</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.details
                    .filter(d => d.status === 'error')
                    .map((detail, index) => (
                      <div
                        key={index}
                        className={`${bgColor} rounded p-3 ${borderColor} border`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium">Row {detail.row}:</span>
                            <span className={`ml-2 ${'text-alert'}`}>
                              {detail.error}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Imported Events Section */}
            {results.summary.imported > 0 && (
              <div className={`${cardBg} rounded-lg p-6 ${borderColor} border`}>
                <h2 className="text-xl font-semibold mb-4 text-success">
                  Successfully Imported ({results.summary.imported})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.details
                    .filter(d => d.status === 'imported')
                    .slice(0, 50) // Show first 50
                    .map((detail, index) => (
                      <div
                        key={index}
                        className={`${bgColor} rounded p-3 ${borderColor} border`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Row {detail.row}:</span>
                            <span className={`ml-2 ${'text-admin-text'}`}>
                              {detail.clientEmail} - {detail.eventDate ? formatDateToronto(detail.eventDate) : 'No date'}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            'bg-green-900 text-green-200'
                          }`}>
                            Imported
                          </span>
                        </div>
                      </div>
                    ))}
                  {results.summary.imported > 50 && (
                    <p className={`text-sm mt-2 ${'text-admin-muted'}`}>
                      ... and {results.summary.imported - 50} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

