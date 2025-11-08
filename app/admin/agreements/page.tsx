'use client';

import { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import RichTextEditor, { RichTextPreview } from '../../components/RichTextEditor';
import SearchableSelect from '../../components/SearchableSelect';

interface Agreement {
  id: string;
  uniqueToken: string;
  status: 'DRAFT' | 'LIVE' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  signedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  lastEmailedAt?: string;
  emailSendCount: number;
  selectedBackdropName?: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    id: string;
    title: string;
    htmlContent: string;
  };
  event?: {
    id: string;
    eventDate?: string;
    eventType?: string;
    eventLocation?: string;
    eventStartTime?: string;
    eventDuration?: string;
    eventPackage?: string;
    packagePrice?: number | string;
  } | null;
}

interface WarningData {
  warnings: Array<{
    id: string;
    warningType: 'expiration' | 'critical' | 'warning';
    daysSinceSent?: number;
    hoursUntilExpiry?: number;
  }>;
}

export default function AgreementsPage() {
  const hasFetchedData = useRef(false);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [warningData, setWarningData] = useState<WarningData | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingToClient, setSendingToClient] = useState<Record<string, boolean>>({});
  const [deletingAgreement, setDeletingAgreement] = useState<Record<string, boolean>>({});
  const [archivingAgreement, setArchivingAgreement] = useState<Record<string, boolean>>({});
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [editingAgreementId, setEditingAgreementId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editingStatusAgreementId, setEditingStatusAgreementId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Portal enhancements state
  const [paymentStatus, setPaymentStatus] = useState('');
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [stripeReceiptLink, setStripeReceiptLink] = useState('');
  const [galleryLink, setGalleryLink] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [backdropLinks, setBackdropLinks] = useState<any[]>([]);
  const [selectedBackdropLinkId, setSelectedBackdropLinkId] = useState('');
  
  // Backdrop selection state
  const [backdropOptions, setBackdropOptions] = useState<any[]>([]);
  const [selectedBackdropName, setSelectedBackdropName] = useState('');
  const [loadingBackdropOptions, setLoadingBackdropOptions] = useState(false);
  const [attendantId, setAttendantId] = useState<string | null>(null);
  
  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingAgreement, setCancellingAgreement] = useState<Agreement | null>(null);
  const [cancellationStep, setCancellationStep] = useState(1);
  const [cancellationReason, setCancellationReason] = useState('');
  const [adminName, setAdminName] = useState('');
  const [cancellationConfirm, setCancellationConfirm] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Email preview state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewAgreement, setPreviewAgreement] = useState<Agreement | null>(null);
  
  // Invoice creation state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceAgreement, setInvoiceAgreement] = useState<Agreement | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<'default' | 'total-only'>('default');
  
  // Calculate 2 weeks from today for default expiration
  const getDefaultExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // Add 2 weeks
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [newAgreement, setNewAgreement] = useState({
    clientId: '',
    templateId: '',
    eventId: '',
    expiresAt: getDefaultExpirationDate()
  });
  const { isDark } = useDarkMode();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    if (hasFetchedData.current) return;
    hasFetchedData.current = true;
    
    fetchAgreements();
    fetchClients();
    fetchTemplates();
    fetchWarningData();
    fetchBackdropLinks();
  }, []);

  // Handle URL parameters for pre-selecting client, event, or template
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const createParam = urlParams.get('create');
    const clientParam = urlParams.get('client');
    const eventParam = urlParams.get('event');
    const templateIdParam = urlParams.get('templateId');
    
    if (createParam === 'true' && clientParam) {
      try {
        const clientData = JSON.parse(decodeURIComponent(clientParam));
        let eventData = null;
        
        // Parse event data if provided
        if (eventParam) {
          try {
            eventData = JSON.parse(decodeURIComponent(eventParam));
          } catch (e) {
            console.error('Error parsing event data from URL:', e);
          }
        }
        
        // Set the client ID and event ID in the new agreement form
        setNewAgreement(prev => ({
          ...prev,
          clientId: clientData.id,
          eventId: eventData?.id || ''
        }));
        
        // Wait a bit for data to load before showing form
        setTimeout(() => {
          setShowCreateForm(true);
        }, 100);
        
        // Clean up URL parameters
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/admin/agreements');
        }
      } catch (error) {
        console.error('Error parsing client data from URL:', error);
      }
    } else if (templateIdParam) {
      // Set the template ID in the new agreement form
      setNewAgreement(prev => ({
        ...prev,
        templateId: templateIdParam
      }));
      
      // Wait a bit for data to load before showing form
      setTimeout(() => {
        setShowCreateForm(true);
      }, 100);
      
      // Clean up URL parameters
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/admin/agreements');
      }
    }
  }, []);

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/api/agreements');
      if (response.ok) {
        const data = await response.json();
        setAgreements(data);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  };

  const fetchBackdropLinks = async () => {
    try {
      const response = await fetch('/api/agreements/backdrop-links');
      if (response.ok) {
        const data = await response.json();
        setBackdropLinks(data.backdropLinks || []);
      }
    } catch (error) {
      console.error('Error fetching backdrop links:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchWarningData = async () => {
    try {
      const response = await fetch('/api/analytics/warnings');
      if (response.ok) {
        const data = await response.json();
        setWarningData(data);
      }
    } catch (error) {
      console.error('Error fetching warning data:', error);
    }
  };

  const getAgreementWarningType = (agreement: Agreement) => {
    if (!warningData) return null;
    
    const warning = warningData.warnings.find(w => w.id === agreement.id);
    return warning?.warningType || null;
  };

  // Extract attendant ID from backdrop link URL
  // URLs typically follow pattern: https://domain.com/select/[attendantId] or similar
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

  // Fetch backdrop options for a given attendant ID
  const fetchBackdropOptions = async (attendantIdParam: string) => {
    if (!attendantIdParam) {
      setBackdropOptions([]);
      setLoadingBackdropOptions(false);
      return;
    }

    setLoadingBackdropOptions(true);
    setBackdropOptions([]); // Clear previous options while loading
    
    try {
      const response = await fetch(`/api/agreements/backdrop-options?attendantId=${attendantIdParam}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.backdrops) {
          setBackdropOptions(data.backdrops || []);
          if (data.backdrops.length === 0) {
            // Don't show error if no backdrops - just empty state
            console.log('No backdrop options available for this attendant');
          }
        } else {
          setBackdropOptions([]);
          showToast('Invalid response from backdrop options API', 'error');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch backdrop options:', response.status, errorData);
        setBackdropOptions([]);
        const errorMessage = errorData.error || 'Failed to load backdrop options. The backdrop tool may be unavailable.';
        showToast(errorMessage, 'error');
      }
    } catch (error: any) {
      console.error('Error fetching backdrop options:', error);
      setBackdropOptions([]);
      const errorMessage = error.message?.includes('fetch') 
        ? 'Unable to connect to backdrop tool. Please check your connection and try again.'
        : 'Error loading backdrop options';
      showToast(errorMessage, 'error');
    } finally {
      setLoadingBackdropOptions(false);
    }
  };

  // Handle backdrop link selection change
  const handleBackdropLinkChange = (backdropLinkId: string) => {
    setSelectedBackdropLinkId(backdropLinkId);
    setSelectedBackdropName(''); // Clear selection when backdrop link changes
    
    if (!backdropLinkId) {
      setAttendantId(null);
      setBackdropOptions([]);
      return;
    }

    // Find the backdrop link and extract attendant ID
    const backdropLink = backdropLinks.find(link => link.id === backdropLinkId);
    if (backdropLink?.url) {
      const extractedAttendantId = extractAttendantIdFromUrl(backdropLink.url);
      if (extractedAttendantId) {
        setAttendantId(extractedAttendantId);
        fetchBackdropOptions(extractedAttendantId);
      } else {
        setAttendantId(null);
        setBackdropOptions([]);
        showToast('Could not extract attendant ID from backdrop link URL. Please check the URL format.', 'error');
      }
    } else {
      setAttendantId(null);
      setBackdropOptions([]);
      if (backdropLinkId) {
        showToast('Backdrop link URL not found. Please refresh and try again.', 'error');
      }
    }
  };

  // Handle backdrop selection save
  const handleSaveBackdropSelection = async () => {
    if (!selectedAgreement) {
      showToast('No agreement selected', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/agreements/update-backdrop-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          backdropName: selectedBackdropName || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const message = selectedBackdropName ? 'Backdrop selection saved successfully!' : 'Backdrop selection cleared successfully!';
        showToast(message);
        // Update the agreement in the list
        fetchAgreements();
        // Update selected agreement
        if (selectedAgreement) {
          const updatedAgreement = agreements.find(a => a.id === selectedAgreement.id);
          if (updatedAgreement) {
            (updatedAgreement as any).selectedBackdropName = selectedBackdropName || null;
            setSelectedAgreement(updatedAgreement);
          }
        }
        // Clear the selection in the UI if it was cleared
        if (!selectedBackdropName) {
          setSelectedBackdropName('');
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to save backdrop selection', 'error');
      }
    } catch (error) {
      console.error('Error saving backdrop selection:', error);
      showToast('Failed to save backdrop selection', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle clearing backdrop selection
  const handleClearBackdropSelection = async () => {
    if (!selectedAgreement) {
      return;
    }

    if (!confirm('Are you sure you want to clear the backdrop selection?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/agreements/update-backdrop-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          backdropName: '',
        }),
      });

      if (response.ok) {
        showToast('Backdrop selection cleared successfully!');
        setSelectedBackdropName('');
        // Update the agreement in the list
        fetchAgreements();
        // Update selected agreement
        if (selectedAgreement) {
          const updatedAgreement = agreements.find(a => a.id === selectedAgreement.id);
          if (updatedAgreement) {
            (updatedAgreement as any).selectedBackdropName = null;
            setSelectedAgreement(updatedAgreement);
          }
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to clear backdrop selection', 'error');
      }
    } catch (error) {
      console.error('Error clearing backdrop selection:', error);
      showToast('Failed to clear backdrop selection', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgreement),
      });

      if (response.ok) {
        const createdAgreement = await response.json();
        setAgreements([createdAgreement, ...agreements]);
        setShowCreateForm(false);
        setNewAgreement({ clientId: '', templateId: '', eventId: '', expiresAt: getDefaultExpirationDate() });
        showToast('Agreement created successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to create agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating agreement:', error);
      showToast('Failed to create agreement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgreement = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setEditingContent(agreement.template.htmlContent);
    // Load portal enhancement fields
    setPaymentStatus((agreement as any).paymentStatus || '');
    setStripePaymentLink((agreement as any).stripePaymentLink || '');
    setStripeReceiptLink((agreement as any).stripeReceiptLink || '');
    setGalleryLink((agreement as any).galleryLink || '');
    setNextAction((agreement as any).nextAction || '');
    setSelectedBackdropLinkId((agreement as any).backdropLinkId || '');
    setSelectedBackdropName((agreement as any).selectedBackdropName || '');
    
    // Extract attendant ID and fetch backdrop options if backdrop link is set
    // Use a timeout to ensure backdropLinks are loaded
    setTimeout(() => {
      const backdropLinkId = (agreement as any).backdropLinkId;
      if (backdropLinkId && backdropLinks.length > 0) {
        const backdropLink = backdropLinks.find(link => link.id === backdropLinkId);
        if (backdropLink?.url) {
          const extractedAttendantId = extractAttendantIdFromUrl(backdropLink.url);
          if (extractedAttendantId) {
            setAttendantId(extractedAttendantId);
            fetchBackdropOptions(extractedAttendantId);
          } else {
            setAttendantId(null);
            setBackdropOptions([]);
          }
        } else {
          setAttendantId(null);
          setBackdropOptions([]);
        }
      } else {
        setAttendantId(null);
        setBackdropOptions([]);
      }
    }, 100);
  };

  const handleSaveAgreement = async () => {
    if (!selectedAgreement) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/agreements/update-agreement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedAgreement.id,
          htmlContent: editingContent
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        setAgreements(agreements.map(a => 
          a.id === selectedAgreement.id ? updatedAgreement : a
        ));
        setSelectedAgreement(updatedAgreement);
        showToast('Agreement saved successfully!');
      } else {
        try {
          const error = await response.json();
          const errorMessage = error.error || error.message || 'Unknown error occurred';
          showToast(`Error: ${errorMessage}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to save agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving agreement:', error);
      showToast('Failed to save agreement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePortalFields = async () => {
    if (!selectedAgreement) return;
    
    setSaving(true);
    try {
      // Update payment info
      await fetch(`/api/agreements/update-payment-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          paymentStatus: paymentStatus || '',
          stripePaymentLink: stripePaymentLink || '',
          stripeReceiptLink: stripeReceiptLink || ''
        }),
      });

      // Update gallery link
      await fetch(`/api/agreements/update-gallery-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          galleryLink: galleryLink || ''
        }),
      });

      // Update next action
      await fetch(`/api/agreements/update-next-action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          nextAction: nextAction || ''
        }),
      });

      // Update backdrop link
      await fetch(`/api/agreements/set-backdrop-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
          backdropLinkId: selectedBackdropLinkId || null
        }),
      });

      showToast('Portal fields updated successfully!');
      fetchAgreements(); // Refresh the list
    } catch (error) {
      console.error('Error updating portal fields:', error);
      showToast('Failed to update portal fields', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewEmail = (agreement: Agreement) => {
    setPreviewAgreement(agreement);
    setShowEmailPreview(true);
  };

  const handleSendToClient = async (agreement: Agreement) => {
    try {
      setSendingToClient(prev => ({ ...prev, [agreement.id]: true }));
      const response = await fetch('/api/agreements/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId: agreement.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the agreement status if it was changed to LIVE
        if (data.status) {
          setAgreements(agreements.map(a => 
            a.id === agreement.id ? { ...a, status: data.status } : a
          ));
        }
        showToast(`Agreement sent successfully to ${agreement.client.email}!`);
      } else {
        // If email failed but we have a fallback link, show both error and fallback
        if (data.fallback) {
          showToast(`Email failed: ${data.error}. ${data.fallback.message}`, 'error');
          // Also copy the link to clipboard
          try {
            await navigator.clipboard.writeText(data.fallback.clientLink);
            showToast('Fallback link copied to clipboard!', 'info');
          } catch (clipboardError) {
            console.log('Could not copy to clipboard:', clipboardError);
          }
        } else {
          showToast(`Error: ${data.error || 'Failed to send agreement'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error sending agreement:', error);
      showToast('Failed to send agreement. Please try again later.', 'error');
    } finally {
      setSendingToClient(prev => ({ ...prev, [agreement.id]: false }));
    }
  };

  const handleResendEmail = async (agreement: Agreement) => {
    try {
      setSendingToClient(prev => ({ ...prev, [agreement.id]: true }));
      const response = await fetch('/api/agreements/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId: agreement.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the agreement with new email tracking data
        setAgreements(agreements.map(a => 
          a.id === agreement.id ? { 
            ...a, 
            lastEmailedAt: new Date().toISOString(),
            emailSendCount: (a.emailSendCount || 0) + 1
          } : a
        ));
        showToast(`Agreement resent successfully to ${agreement.client.email}! (Send #${(agreement.emailSendCount || 0) + 1})`);
      } else {
        // If email failed but we have a fallback link, show both error and fallback
        if (data.fallback) {
          showToast(`Email failed: ${data.error}. ${data.fallback.message}`, 'error');
          // Also copy the link to clipboard
          try {
            await navigator.clipboard.writeText(data.fallback.clientLink);
            showToast('Fallback link copied to clipboard!', 'info');
          } catch (clipboardError) {
            console.log('Could not copy to clipboard:', clipboardError);
          }
        } else {
          showToast(`Error: ${data.error || 'Failed to resend agreement'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error resending agreement:', error);
      showToast('Failed to resend agreement. Please try again later.', 'error');
    } finally {
      setSendingToClient(prev => ({ ...prev, [agreement.id]: false }));
    }
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to delete this DRAFT agreement? This action cannot be undone and will permanently remove the agreement.')) {
      return;
    }

    setDeletingAgreement(prev => ({ ...prev, [agreementId]: true }));
    try {
      const response = await fetch(`/api/agreements/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: agreementId }),
      });

      if (response.ok) {
        setAgreements(agreements.filter(a => a.id !== agreementId));
        showToast('Agreement deleted successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to delete agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
      showToast('Failed to delete agreement', 'error');
    } finally {
      setDeletingAgreement(prev => ({ ...prev, [agreementId]: false }));
    }
  };

  const handleCopyLink = async (uniqueToken: string) => {
    try {
      const clientLink = `${window.location.origin}/agreement/${uniqueToken}`;
      await navigator.clipboard.writeText(clientLink);
      showToast('Copied!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showToast('Failed to copy link', 'error');
    }
  };

  const handleUpdateExpiration = async (agreementId: string) => {
    if (!newExpirationDate) {
      showToast('Please select a new expiration date', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/agreements/update-expiration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: agreementId, 
          expiresAt: newExpirationDate 
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        setAgreements(agreements.map(a => 
          a.id === agreementId ? { ...a, expiresAt: updatedAgreement.expiresAt } : a
        ));
        setEditingExpiration(false);
        setNewExpirationDate('');
        showToast('Expiration date updated successfully!');
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to update expiration date'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating expiration date:', error);
      showToast('Failed to update expiration date', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (agreementId: string) => {
    if (!newStatus) {
      showToast('Please select a new status', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/agreements/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: agreementId, 
          status: newStatus 
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        
        // If status is COMPLETED, remove from list since it's now archived
        if (newStatus === 'COMPLETED') {
          setAgreements(agreements.filter(a => a.id !== agreementId));
          showToast('Agreement marked as completed and moved to archived section!');
        } else {
          setAgreements(agreements.map(a => 
            a.id === agreementId ? { ...a, status: updatedAgreement.status } : a
          ));
          showToast('Status updated successfully!');
        }
        
        setEditingStatus(false);
        setNewStatus('');
        setEditingStatusAgreementId(null);
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to update status'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cancellation functions
  const handleCancelAgreement = (agreement: Agreement) => {
    if (agreement.status !== 'SIGNED') {
      showToast('Only signed agreements can be cancelled', 'error');
      return;
    }
    setCancellingAgreement(agreement);
    setShowCancelModal(true);
    setCancellationStep(1);
    setCancellationReason('');
    setAdminName('');
    setCancellationConfirm('');
  };

  const handleCancelStep1 = () => {
    if (!cancellationReason.trim()) {
      showToast('Please provide a reason for cancellation', 'error');
      return;
    }
    setCancellationStep(2);
  };

  const handleCancelStep2 = () => {
    if (!adminName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setCancellationStep(3);
  };

  const handleCancelStep3 = () => {
    if (cancellationConfirm !== 'CANCEL AGREEMENT') {
      showToast('Please type "CANCEL AGREEMENT" exactly as shown', 'error');
      return;
    }
    setCancellationStep(4);
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingAgreement) return;

    try {
      setCancelling(true);
      const response = await fetch('/api/agreements/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreementId: cancellingAgreement.id,
          cancellationReason: cancellationReason,
          adminName: adminName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove the agreement from the list since it's now archived
        setAgreements(agreements.filter(a => a.id !== cancellingAgreement.id));
        
        showToast('Agreement cancelled and archived successfully! Client has been notified via email.', 'success');
        setShowCancelModal(false);
        setCancellingAgreement(null);
        setCancellationStep(1);
        setCancellationReason('');
        setAdminName('');
        setCancellationConfirm('');
      } else {
        showToast(`Error: ${data.error || 'Failed to cancel agreement'}`, 'error');
      }
    } catch (error) {
      console.error('Error cancelling agreement:', error);
      showToast('Failed to cancel agreement', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancellingAgreement(null);
    setCancellationStep(1);
    setCancellationReason('');
    setAdminName('');
    setCancellationConfirm('');
  };

  // Invoice creation functions
  const handleCreateInvoice = (agreement: Agreement) => {
    setInvoiceAgreement(agreement);
    setShowInvoiceModal(true);
    setInvoiceResult(null);
    setInvoiceError(null);
    setInvoiceType('default');
  };

  const handleConfirmCreateInvoice = async () => {
    if (!invoiceAgreement) return;

    try {
      setCreatingInvoice(true);
      setInvoiceError(null);
      setInvoiceResult(null);

      const response = await fetch('/api/agreements/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreementId: invoiceAgreement.id,
          invoiceType: invoiceType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInvoiceResult(data);
        showToast(`Successfully created ${data.invoices?.length || 1} invoice(s)!`, 'success');
        // Refresh agreements to get updated stripePaymentLink
        fetchAgreements();
      } else {
        setInvoiceError(data.error || data.message || 'Failed to create invoice');
        showToast(`Error: ${data.error || data.message || 'Failed to create invoice'}`, 'error');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      setInvoiceError(error.message || 'Failed to create invoice');
      showToast('Failed to create invoice', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setInvoiceAgreement(null);
    setInvoiceResult(null);
    setInvoiceError(null);
    setCreatingInvoice(false);
    setInvoiceType('default');
  };

  const handleArchiveAgreement = async (agreementId: string) => {
    if (!confirm('Are you sure you want to archive this agreement? It will be moved to the archived section.')) {
      return;
    }

    setArchivingAgreement(prev => ({ ...prev, [agreementId]: true }));
    try {
      const response = await fetch('/api/agreements/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId }),
      });

      if (response.ok) {
        showToast('Agreement archived successfully', 'success');
        fetchAgreements(); // Refresh the list
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to archive agreement', 'error');
      }
    } catch (error) {
      console.error('Error archiving agreement:', error);
      showToast('Error archiving agreement', 'error');
    } finally {
      setArchivingAgreement(prev => ({ ...prev, [agreementId]: false }));
    }
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: isMobile ? '16px' : '24px'
    }}>
      <ToastContainer />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '0'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: isMobile ? '24px' : '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Agreements
            </h1>
            <p style={{ 
              margin: '0 0 12px 0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Manage client agreements and contracts
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => router.push('/admin/agreements/archived')}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                }}
                title="View archived agreements (includes completed and cancelled)"
              >
                Archived
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: isMobile ? '12px 20px' : '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: isMobile ? '100%' : 'auto'
            }}
            title="Create a new agreement"
          >
            + New Agreement
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
              Create New Agreement
            </h2>
            <form onSubmit={handleCreateAgreement}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Client
                  </label>
                  <SearchableSelect
                    options={clients.map(client => ({
                      id: client.id,
                      label: `${client.firstName} ${client.lastName} (${client.email})`,
                      value: client.id
                    }))}
                    value={newAgreement.clientId}
                    onChange={(value) => setNewAgreement({ ...newAgreement, clientId: value })}
                    placeholder="Search and select a client..."
                    required
                    style={{
                      borderColor: borderColor,
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Template
                  </label>
                  <select
                    value={newAgreement.templateId}
                    onChange={(e) => setNewAgreement({ ...newAgreement, templateId: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.internalTitle || template.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: textColor 
                  }}>
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={newAgreement.expiresAt}
                    onChange={(e) => setNewAgreement({ ...newAgreement, expiresAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Agreement'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agreements List */}
        {agreements.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              No agreements found. Create your first agreement to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {agreements.map(agreement => {
              const warningType = getAgreementWarningType(agreement);
              const getWarningBorderStyle = () => {
                if (warningType === 'expiration') {
                  return '3px solid #dc2626'; // Red for expiring
                } else if (warningType === 'critical') {
                  return '3px solid #dc2626'; // Red for critical (5+ days)
                } else if (warningType === 'warning') {
                  return '3px solid #f59e0b'; // Yellow for warning (3+ days)
                }
                return `1px solid ${borderColor}`;
              };

              return (
              <div key={agreement.id} style={{
                backgroundColor: cardBg,
                border: getWarningBorderStyle(),
                borderRadius: '8px',
                padding: '20px',
                position: 'relative'
              }}>
                {/* Warning Indicator */}
                {warningType && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '16px',
                    zIndex: 1
                  }}>
                    {warningType === 'expiration' ? '⏰' : 
                     warningType === 'critical' ? '🚨' : '⚠️'}
                  </div>
                )}

                {/* Confidence Indicator for Unresponsive Clients */}
                {agreement.status === 'LIVE' && agreement.lastEmailedAt && (() => {
                  const daysSinceEmailed = Math.floor((Date.now() - new Date(agreement.lastEmailedAt).getTime()) / (1000 * 60 * 60 * 24));
                  const isUnresponsive = daysSinceEmailed >= 3;
                  const needsPersonalFollowUp = daysSinceEmailed >= 5;
                  
                  if (isUnresponsive) {
                    return (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: needsPersonalFollowUp ? '#dc2626' : '#f59e0b',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {needsPersonalFollowUp ? '🚨' : '⚠️'}
                        {needsPersonalFollowUp ? 'Needs Personal Follow-up' : 'Might need personal follow-up'}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start',
                  marginBottom: '12px',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '12px' : '0'
                }}>
                  <div style={{ position: 'relative' }}>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '16px', 
                      color: textColor,
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      // Show engagement tooltip
                      const tooltip = document.createElement('div');
                      tooltip.id = 'engagement-tooltip';
                      tooltip.style.cssText = `
                        position: absolute;
                        top: -10px;
                        left: 0;
                        background: ${isDark ? '#1e293b' : '#ffffff'};
                        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                        border-radius: 8px;
                        padding: 12px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        z-index: 1000;
                        min-width: 200px;
                        font-size: 12px;
                        color: ${isDark ? '#f1f5f9' : '#1e293b'};
                      `;
                      
                      const daysSinceEmailed = agreement.lastEmailedAt ? 
                        Math.floor((Date.now() - new Date(agreement.lastEmailedAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
                      
                      tooltip.innerHTML = `
                        <div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#f1f5f9' : '#1e293b'}">
                          📊 Engagement Log
                        </div>
                        <div style="margin-bottom: 4px">
                          <strong>Email Sent:</strong> ${agreement.emailSendCount} time${agreement.emailSendCount > 1 ? 's' : ''}
                        </div>
                        ${agreement.lastEmailedAt ? `
                          <div style="margin-bottom: 4px">
                            <strong>Last Emailed:</strong> ${new Date(agreement.lastEmailedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                          </div>
                          <div style="margin-bottom: 4px">
                            <strong>Days Since:</strong> ${daysSinceEmailed} day${daysSinceEmailed && daysSinceEmailed > 1 ? 's' : ''}
                          </div>
                        ` : ''}
                        <div style="margin-bottom: 4px">
                          <strong>Status:</strong> ${agreement.status}
                        </div>
                        ${agreement.status === 'LIVE' && daysSinceEmailed && daysSinceEmailed >= 3 ? `
                          <div style="color: #f59e0b; font-weight: 600; margin-top: 8px; padding-top: 8px; border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'}">
                            ⚠️ Client may need follow-up
                          </div>
                        ` : ''}
                      `;
                      
                      e.currentTarget.appendChild(tooltip);
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = document.getElementById('engagement-tooltip');
                      if (tooltip) {
                        tooltip.remove();
                      }
                    }}
                    >
                      {agreement.client.firstName} {agreement.client.lastName}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.template.title}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: mutedText, fontSize: '14px' }}>
                      {agreement.client.email}
                    </p>
                    {agreement.selectedBackdropName && (
                      <p style={{ margin: '4px 0 0 0', color: '#059669', fontSize: '14px', fontWeight: '500' }}>
                        🖼️ Selected Backdrop: {agreement.selectedBackdropName}
                      </p>
                    )}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: agreement.status === 'DRAFT' ? '#dc2626' : 
                             agreement.status === 'LIVE' ? '#059669' :
                             agreement.status === 'SIGNED' ? '#2563eb' :
                             agreement.status === 'COMPLETED' ? '#7c3aed' :
                             agreement.status === 'CANCELLED' ? '#dc2626' : mutedText,
                      backgroundColor: agreement.status === 'DRAFT' ? '#fef2f2' :
                                      agreement.status === 'LIVE' ? '#f0fdf4' :
                                      agreement.status === 'SIGNED' ? '#eff6ff' :
                                      agreement.status === 'COMPLETED' ? '#faf5ff' :
                                      agreement.status === 'CANCELLED' ? '#fef2f2' :
                                      isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      alignSelf: isMobile ? 'flex-start' : 'auto',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'border-color 0.2s',
                      fontWeight: '500'
                    }}
                    onClick={() => {
                      setEditingStatus(true);
                      setEditingStatusAgreementId(agreement.id);
                      setNewStatus(agreement.status);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    title="Click to edit status"
                    >
                      {agreement.status}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: mutedText,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      alignSelf: isMobile ? 'flex-start' : 'auto'
                    }}>
                      Created {new Date(agreement.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                    </span>
                    {agreement.lastEmailedAt && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#059669',
                        backgroundColor: '#f0fdf4',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        alignSelf: isMobile ? 'flex-start' : 'auto',
                        border: '1px solid #bbf7d0'
                      }}
                      title={`Email sent ${agreement.emailSendCount} time${agreement.emailSendCount > 1 ? 's' : ''}`}
                      >
                        Emailed {new Date(agreement.lastEmailedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                      </span>
                    )}
                    {agreement.event?.eventDate && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#7c3aed',
                        backgroundColor: isDark ? '#3e1f5f' : '#f3e8ff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        alignSelf: isMobile ? 'flex-start' : 'auto',
                        border: '1px solid #c4b5fd'
                      }}
                      >
                        Event {new Date(agreement.event.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                      </span>
                    )}
                    {agreement.status !== 'SIGNED' && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: mutedText,
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        alignSelf: isMobile ? 'flex-start' : 'auto',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setEditingExpiration(true);
                        setEditingAgreementId(agreement.id);
                        setNewExpirationDate(new Date(agreement.expiresAt).toISOString().slice(0, 16));
                      }}
                      title="Click to edit expiration date"
                      >
                        Expires {new Date(agreement.expiresAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleEditAgreement(agreement)}
                    style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#047857';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    title="Edit agreement content"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCreateInvoice(agreement)}
                    disabled={!agreement.client.email}
                    style={{
                      backgroundColor: !agreement.client.email ? '#9ca3af' : '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: !agreement.client.email ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (agreement.client.email) {
                        e.currentTarget.style.backgroundColor = '#7c3aed';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (agreement.client.email) {
                        e.currentTarget.style.backgroundColor = '#8b5cf6';
                      }
                    }}
                    title={!agreement.client.email ? 'Client email is required to create invoice' : 'Create Stripe invoice for this agreement'}
                  >
                    💳 Create Invoice
                  </button>
                  <button
                    onClick={() => {
                      const adminPreviewLink = `${window.location.origin}/admin/preview/${agreement.uniqueToken}`;
                      window.open(adminPreviewLink, '_blank');
                    }}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                    title="View agreement as client would see it"
                  >
                    View Agreement
                  </button>
                  <button
                    onClick={() => {
                      const attendantLink = `${window.location.origin}/attendant/${agreement.id}`;
                      window.open(attendantLink, '_blank');
                    }}
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }}
                    title="View attendant page (event details for staff)"
                  >
                    Attendant View
                  </button>
                  <button
                    onClick={() => handleCopyLink(agreement.uniqueToken)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                    title="Copy client link to clipboard"
                  >
                    Copy Link
                  </button>
                  {(agreement.status === 'LIVE' || agreement.status === 'SIGNED') && agreement.lastEmailedAt && (
                    <button
                      onClick={() => handleResendEmail(agreement)}
                      disabled={sendingToClient[agreement.id]}
                      style={{
                        backgroundColor: sendingToClient[agreement.id] ? '#9ca3af' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: sendingToClient[agreement.id] ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!sendingToClient[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#d97706';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sendingToClient[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#f59e0b';
                        }
                      }}
                      title={`Resend email to client (Previously sent ${agreement.emailSendCount} time${agreement.emailSendCount > 1 ? 's' : ''})`}
                    >
                      {sendingToClient[agreement.id] ? 'Sending...' : 'Resend Email'}
                    </button>
                  )}
                  {agreement.status === 'DRAFT' && (
                    <button
                      onClick={() => handleSendToClient(agreement)}
                      disabled={sendingToClient[agreement.id]}
                      style={{
                        backgroundColor: sendingToClient[agreement.id] ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: sendingToClient[agreement.id] ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!sendingToClient[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#b91c1c';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sendingToClient[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }
                      }}
                      title="Send agreement to client"
                    >
                      {sendingToClient[agreement.id] ? 'Sending...' : 'Send to Client'}
                    </button>
                  )}
                  {agreement.status === 'DRAFT' && (
                    <button
                      onClick={() => handleDeleteAgreement(agreement.id)}
                      disabled={deletingAgreement[agreement.id]}
                      style={{
                        backgroundColor: deletingAgreement[agreement.id] ? '#9ca3af' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: deletingAgreement[agreement.id] ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!deletingAgreement[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#4b5563';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deletingAgreement[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#6b7280';
                        }
                      }}
                      title="Delete this agreement permanently (only DRAFT agreements can be deleted)"
                    >
                      {deletingAgreement[agreement.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                  {agreement.status === 'SIGNED' && (
                    <button
                      onClick={() => handleCancelAgreement(agreement)}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#b91c1c';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }}
                      title="Cancel this signed agreement (Admin only - requires confirmation)"
                    >
                      Cancel Agreement
                    </button>
                  )}
                  {(agreement.status === 'SIGNED' || agreement.status === 'COMPLETED') && (
                    <button
                      onClick={() => handleArchiveAgreement(agreement.id)}
                      disabled={archivingAgreement[agreement.id]}
                      style={{
                        backgroundColor: archivingAgreement[agreement.id] ? '#9ca3af' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: archivingAgreement[agreement.id] ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!archivingAgreement[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#4b5563';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!archivingAgreement[agreement.id]) {
                          e.currentTarget.style.backgroundColor = '#6b7280';
                        }
                      }}
                      title="Archive this agreement"
                    >
                      {archivingAgreement[agreement.id] ? 'Archiving...' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {selectedAgreement && (
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
            zIndex: 1000,
            padding: isMobile ? '10px' : '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: isMobile ? '16px' : '24px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: '0', fontSize: '20px', color: textColor }}>
                  Edit Agreement
                </h2>
                <button
                  onClick={() => setSelectedAgreement(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: mutedText,
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                    e.currentTarget.style.color = textColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = mutedText;
                  }}
                  title="Close modal"
                >
                  ×
                </button>
              </div>

              {/* Content Editor */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Agreement Content
                </label>
                <RichTextEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  placeholder="Enter agreement content here..."
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    color: textColor,
                    borderColor: borderColor
                  }}
                />
              </div>


              {/* Smart Field Quick Add Buttons */}

              <div style={{ marginBottom: '16px' }}>

                <label style={{ 

                  display: 'block', 

                  marginBottom: '8px', 

                  fontWeight: '500', 

                  color: '$' + '{textColor}',

                  fontSize: '14px'

                }}>

                  Quick Add Smart Fields

                </label>

                <div style={{ 

                  display: 'flex', 

                  flexWrap: 'wrap', 

                  gap: '8px'

                }}>

                  {[

                    { field: '{{client.firstName}}', label: 'First Name' },

                    { field: '{{client.lastName}}', label: 'Last Name' },

                    { field: '{{client.email}}', label: 'Email' },

                    { field: '{{client.phone}}', label: 'Phone' },

                    { field: '{{client.eventDate}}', label: 'Event Date' },

                    { field: '{{client.notes}}', label: 'Notes' },

                    { field: '{{agreement.date}}', label: 'Agreement Date' },

                    { field: '{{agreement.id}}', label: 'Agreement ID' }

                  ].map((sf) => (

                    <button

                      key={sf.field}

                      type="button"

                      onClick={() => setEditingContent(prev => prev + ' ' + sf.field)}

                      style={{

                        padding: '6px 12px',

                        fontSize: '12px',

                        borderRadius: '4px',

                        border: '1px solid ' + borderColor,

                        backgroundColor: isDark ? '#1e293b' : '#ffffff',

                        color: textColor,

                        cursor: 'pointer',

                        transition: 'all 0.2s'

                      }}

                      onMouseEnter={(e) => {

                        e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';

                      }}

                      onMouseLeave={(e) => {

                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';

                      }}

                      title={'Insert ' + sf.label}

                    >

                      {sf.label}

                    </button>

                  ))}

                </div>

              </div>

              {/* Preview */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Preview
                </label>
                <RichTextPreview 
                  html={editingContent || '<p>Enter content above to see preview...</p>'}
                  clientData={selectedAgreement?.client}
                  agreementId={selectedAgreement?.id}
                  eventData={selectedAgreement?.event}
                  isDark={isDark}
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#fafafa',
                    borderColor: borderColor
                  }}
                />
              </div>

              {/* Portal Enhancement Fields */}
              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
                  Client Portal Settings
                </h3>

                {/* Payment Status */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Not Set</option>
                    <option value="Not paid">Not paid</option>
                    <option value="Deposit paid">Deposit paid</option>
                    <option value="Balance due">Balance due</option>
                    <option value="Fully paid">Fully paid</option>
                  </select>
                </div>

                {/* Stripe Payment Link */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Stripe Payment Link
                  </label>
                  <input
                    type="url"
                    value={stripePaymentLink}
                    onChange={(e) => setStripePaymentLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Stripe Receipt Link */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Stripe Receipt Link
                  </label>
                  <input
                    type="url"
                    value={stripeReceiptLink}
                    onChange={(e) => setStripeReceiptLink(e.target.value)}
                    placeholder="https://stripe.com/receipts/..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Gallery Link */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Event Gallery Link
                  </label>
                  <input
                    type="url"
                    value={galleryLink}
                    onChange={(e) => setGalleryLink(e.target.value)}
                    placeholder="https://gallery.example.com/event..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Next Action */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Next Action (displayed to client)
                  </label>
                  <input
                    type="text"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="e.g., Template approval pending..."
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Backdrop Link Selection */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                    Backdrop Selection Link
                  </label>
                  <select
                    value={selectedBackdropLinkId}
                    onChange={(e) => handleBackdropLinkChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                  >
                    <option value="">No backdrop link</option>
                    {backdropLinks.map(link => (
                      <option key={link.id} value={link.id}>{link.name}</option>
                    ))}
                  </select>
                </div>

                {/* Backdrop Selection Dropdown */}
                {selectedBackdropLinkId && attendantId && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: textColor, fontSize: '13px' }}>
                      Select Backdrop
                    </label>
                    {loadingBackdropOptions ? (
                      <div style={{ 
                        padding: '8px 12px', 
                        color: mutedText, 
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        Loading backdrop options...
                      </div>
                    ) : backdropOptions.length > 0 ? (
                      <div>
                        <select
                          value={selectedBackdropName}
                          onChange={(e) => setSelectedBackdropName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '4px',
                            backgroundColor: cardBg,
                            color: textColor,
                            fontSize: '14px',
                            marginBottom: '8px'
                          }}
                        >
                          <option value="">-- Select a backdrop --</option>
                          {backdropOptions.map(backdrop => (
                            <option key={backdrop.id} value={backdrop.name}>
                              {backdrop.name}
                            </option>
                          ))}
                        </select>
                        {selectedBackdropName && (
                          <button
                            onClick={handleSaveBackdropSelection}
                            disabled={saving}
                            style={{
                              width: '100%',
                              backgroundColor: saving ? '#9ca3af' : '#059669',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            {saving ? 'Saving...' : 'Save Backdrop Selection'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '8px 12px', 
                        color: mutedText, 
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        No backdrop options available for this attendant
                      </div>
                    )}
                    {selectedBackdropName && !loadingBackdropOptions && (
                      <div style={{ 
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: isDark ? '#1e3a5f' : '#dbeafe',
                        border: `1px solid ${isDark ? '#3b82f6' : '#3b82f6'}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: isDark ? '#93c5fd' : '#1e40af',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Current selection: <strong>{selectedBackdropName}</strong></span>
                        <button
                          onClick={handleClearBackdropSelection}
                          disabled={saving}
                          style={{
                            backgroundColor: 'transparent',
                            color: isDark ? '#f87171' : '#dc2626',
                            border: `1px solid ${isDark ? '#f87171' : '#dc2626'}`,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            marginLeft: '8px'
                          }}
                          title="Clear backdrop selection"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Update Portal Fields Button */}
                <button
                  onClick={handleUpdatePortalFields}
                  disabled={saving}
                  style={{
                    width: '100%',
                    backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px' : '10px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '13px' : '14px',
                    fontWeight: '500',
                    marginTop: '8px'
                  }}
                >
                  {saving ? 'Updating...' : 'Update Portal Settings'}
                </button>
              </div>
              
              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '8px' : '12px', 
                justifyContent: 'center',
                paddingTop: '16px',
                borderTop: `1px solid ${borderColor}`
              }}>
                <button
                  onClick={handleSaveAgreement}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="Save changes to this agreement"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    const clientLink = `${window.location.origin}/agreement/${selectedAgreement.uniqueToken}`;
                    window.open(clientLink, '_blank');
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="Open client view in new tab"
                >
                  {isMobile ? 'Preview' : 'Preview Client View'}
                </button>
                <button
                  onClick={() => {
                    if (selectedAgreement?.id) {
                      const attendantLink = `${window.location.origin}/attendant/${selectedAgreement.id}`;
                      window.open(attendantLink, '_blank');
                    }
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="View attendant page (event details for staff)"
                >
                  {isMobile ? '👥 Attendant' : '👥 Attendant View'}
                </button>
                <button
                  onClick={() => {
                    if (selectedAgreement?.client?.email) {
                      // Open portal admin preview in a new tab
                      const portalUrl = `${window.location.origin}/portal/admin-preview?email=${encodeURIComponent(selectedAgreement.client.email)}`;
                      window.open(portalUrl, '_blank');
                    } else {
                      alert('Client email not found');
                    }
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="View client portal (admin preview)"
                  disabled={!selectedAgreement?.client?.email}
                >
                  {isMobile ? '🔍 Portal' : '🔍 View Client Portal'}
                </button>
                <button
                  onClick={() => handlePreviewEmail(selectedAgreement)}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="Preview the email that will be sent to the client"
                >
                  {isMobile ? '📧 Email' : '📧 Preview Email'}
                </button>
                <button
                  onClick={() => handleSendToClient(selectedAgreement)}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '8px 12px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '13px' : '16px',
                    fontWeight: '500',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  title="Send this agreement to the client"
                >
                  {loading ? 'Sending...' : (isMobile ? 'Send' : 'Send to Client')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Edit Modal */}
        {editingStatus && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Edit Agreement Status
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '14px'
                  }}
                >
                  <option value="DRAFT">Draft - Use while creating the agreement</option>
                  <option value="LIVE">Live - Use after the agreement has been sent</option>
                  <option value="SIGNED">Signed - Use after the agreement has been signed</option>
                  <option value="COMPLETED">Completed - Use once the event is over</option>
                  <option value="CANCELLED">Cancelled - Agreement has been cancelled (Admin only)</option>
                </select>
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setEditingStatusAgreementId(null);
                    setNewStatus('');
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(editingStatusAgreementId || '')}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Date Edit Modal */}
        {editingExpiration && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Edit Expiration Date
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor 
                }}>
                  New Expiration Date
                </label>
                <input
                  type="datetime-local"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setEditingExpiration(false);
                    setEditingAgreementId(null);
                    setNewExpirationDate('');
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateExpiration(editingAgreementId || '')}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {showCancelModal && cancellingAgreement && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                color: textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#dc2626' }}>⚠️</span>
                Cancel Agreement - Step {cancellationStep} of 4
              </h3>

              {/* Step 1: Reason */}
              {cancellationStep === 1 && (
                <div>
                  <p style={{ margin: '0 0 16px 0', color: textColor }}>
                    <strong>Client:</strong> {cancellingAgreement.client.firstName} {cancellingAgreement.client.lastName}<br/>
                    <strong>Template:</strong> {cancellingAgreement.template.title}<br/>
                    <strong>Signed:</strong> {cancellingAgreement.signedAt ? new Date(cancellingAgreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: textColor 
                    }}>
                      Reason for Cancellation *
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Please provide a detailed reason for cancelling this agreement..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        backgroundColor: cardBg,
                        color: textColor,
                        fontSize: '14px',
                        minHeight: '100px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'flex-end' 
                  }}>
                    <button
                      onClick={closeCancelModal}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCancelStep1}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Admin Name */}
              {cancellationStep === 2 && (
                <div>
                  <p style={{ margin: '0 0 16px 0', color: textColor }}>
                    <strong>Reason:</strong> {cancellationReason}
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: textColor 
                    }}>
                      Your Name (Admin) *
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Enter your full name"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        backgroundColor: cardBg,
                        color: textColor,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'flex-end' 
                  }}>
                    <button
                      onClick={() => setCancellationStep(1)}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCancelStep2}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {cancellationStep === 3 && (
                <div>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>⚠️ Final Confirmation Required</h4>
                    <p style={{ margin: '0', color: '#991b1b', fontSize: '14px' }}>
                      This action will permanently cancel the agreement, move it to the archived section, and notify the client via email. 
                      This cannot be undone.
                    </p>
                  </div>
                  <p style={{ margin: '0 0 16px 0', color: textColor }}>
                    <strong>Client:</strong> {cancellingAgreement.client.firstName} {cancellingAgreement.client.lastName}<br/>
                    <strong>Template:</strong> {cancellingAgreement.template.title}<br/>
                    <strong>Reason:</strong> {cancellationReason}<br/>
                    <strong>Cancelled by:</strong> {adminName}
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: textColor 
                    }}>
                      Type &quot;CANCEL AGREEMENT&quot; to confirm *
                    </label>
                    <input
                      type="text"
                      value={cancellationConfirm}
                      onChange={(e) => setCancellationConfirm(e.target.value)}
                      placeholder="CANCEL AGREEMENT"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        backgroundColor: cardBg,
                        color: textColor,
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'flex-end' 
                  }}>
                    <button
                      onClick={() => setCancellationStep(2)}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCancelStep3}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Final Confirmation */}
              {cancellationStep === 4 && (
                <div>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '6px',
                    padding: '20px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '18px' }}>⚠️ FINAL WARNING</h4>
                    <p style={{ margin: '0', color: '#991b1b', fontSize: '16px', fontWeight: '500' }}>
                      You are about to permanently cancel this signed agreement. It will be moved to the archived section.
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <h5 style={{ margin: '0 0 8px 0', color: textColor }}>Agreement Details:</h5>
                    <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                      <strong>Client:</strong> {cancellingAgreement.client.firstName} {cancellingAgreement.client.lastName}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                      <strong>Email:</strong> {cancellingAgreement.client.email}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                      <strong>Template:</strong> {cancellingAgreement.template.title}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                      <strong>Signed:</strong> {cancellingAgreement.signedAt ? new Date(cancellingAgreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                      <strong>Reason:</strong> {cancellationReason}
                    </p>
                    <p style={{ margin: '0', color: textColor, fontSize: '14px' }}>
                      <strong>Cancelled by:</strong> {adminName}
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'flex-end' 
                  }}>
                    <button
                      onClick={() => setCancellationStep(3)}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmCancellation}
                      disabled={cancelling}
                      style={{
                        backgroundColor: cancelling ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: cancelling ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {cancelling ? 'Cancelling...' : 'CANCEL AGREEMENT'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice Creation Modal */}
        {showInvoiceModal && invoiceAgreement && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: textColor
                }}>
                  💳 Create Stripe Invoice
                </h2>
                <button
                  onClick={closeInvoiceModal}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: textColor,
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Loading State */}
              {creatingInvoice && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>
                    ⏳
                  </div>
                  <p style={{
                    margin: '0',
                    color: textColor,
                    fontSize: '16px'
                  }}>
                    Creating invoice...
                  </p>
                </div>
              )}

              {/* Success State */}
              {!creatingInvoice && invoiceResult && invoiceResult.success && (
                <div>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#16a34a', fontSize: '18px' }}>
                      ✅ Invoice Created Successfully!
                    </h4>
                    <p style={{ margin: '0', color: '#166534', fontSize: '14px' }}>
                      {invoiceResult.message || `Successfully created ${invoiceResult.invoices?.length || 1} invoice(s). The invoice(s) have been sent to the client via email.`}
                    </p>
                  </div>

                  {invoiceResult.invoices && invoiceResult.invoices.length > 0 && (
                    <div style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '24px'
                    }}>
                      <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: textColor
                      }}>
                        Invoice Details
                      </h3>
                      {invoiceResult.invoices.map((invoice: any, index: number) => (
                        <div key={index} style={{
                          padding: '16px',
                          backgroundColor: cardBg,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '6px',
                          marginBottom: index < invoiceResult.invoices.length - 1 ? '12px' : '0'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}>
                            <span style={{
                              backgroundColor: invoice.type === 'deposit' ? '#fef3c7' : invoice.type === 'remaining' ? '#dbeafe' : '#e0e7ff',
                              color: invoice.type === 'deposit' ? '#92400e' : invoice.type === 'remaining' ? '#1e40af' : '#3730a3',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {invoice.type === 'deposit' ? 'Deposit' : invoice.type === 'remaining' ? 'Remaining Balance' : 'Full Amount'}
                            </span>
                            <span style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: textColor
                            }}>
                              ${invoice.amount.toFixed(2)}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: mutedText,
                            marginBottom: '8px'
                          }}>
                            <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString('en-CA', {
                              timeZone: 'America/Toronto',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginTop: '8px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#3b82f6';
                              }}
                            >
                              View Invoice →
                            </a>
                          )}
                        </div>
                      ))}
                      {invoiceResult.customerId && (
                        <div style={{
                          fontSize: '12px',
                          color: mutedText,
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: `1px solid ${borderColor}`
                        }}>
                          <strong>Stripe Customer ID:</strong> {invoiceResult.customerId}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={closeInvoiceModal}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!creatingInvoice && invoiceError && (
                <div>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '18px' }}>
                      ❌ Error Creating Invoice
                    </h4>
                    <p style={{ margin: '0', color: '#991b1b', fontSize: '14px' }}>
                      {invoiceError}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={closeInvoiceModal}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Initial State */}
              {!creatingInvoice && !invoiceResult && !invoiceError && (
                <div>
                  <div style={{
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: textColor
                    }}>
                      Agreement Information
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isDark ? '#94a3b8' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          Client
                        </label>
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: textColor,
                          fontWeight: '500'
                        }}>
                          {invoiceAgreement.client.firstName} {invoiceAgreement.client.lastName}
                        </p>
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isDark ? '#94a3b8' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          Email
                        </label>
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: textColor,
                          fontWeight: '500'
                        }}>
                          {invoiceAgreement.client.email || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isDark ? '#94a3b8' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          Template
                        </label>
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: textColor,
                          fontWeight: '500'
                        }}>
                          {invoiceAgreement.template.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginBottom: '24px'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      Invoice Type
                    </label>
                    <select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value as 'default' | 'total-only')}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        backgroundColor: cardBg,
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="default">Default (Deposit + Remaining)</option>
                      <option value="total-only">Total Amount Only</option>
                    </select>
                  </div>

                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <p style={{
                      margin: '0',
                      color: '#92400e',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      <strong>Note:</strong> This will create a Stripe invoice and send it to the client via email. 
                      {invoiceType === 'default' ? (
                        <>
                          <br />
                          The invoice due dates will be calculated based on the event date:
                          <br />
                          • If event date is more than 7 days away: $100 deposit due today, remaining amount due 7 days before event
                          <br />
                          • If event date is 7 days or less: Full amount due today
                        </>
                      ) : (
                        <>
                          <br />
                          A single invoice will be created for the full amount, due 1 week before the event date.
                        </>
                      )}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={closeInvoiceModal}
                      style={{
                        backgroundColor: 'transparent',
                        color: mutedText,
                        border: `1px solid ${borderColor}`,
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCreateInvoice}
                      disabled={!invoiceAgreement.client.email}
                      style={{
                        backgroundColor: !invoiceAgreement.client.email ? '#9ca3af' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: !invoiceAgreement.client.email ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Create Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Preview Modal */}
        {showEmailPreview && previewAgreement && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: textColor
                }}>
                  📧 Email Preview
                </h2>
                <button
                  onClick={() => {
                    setShowEmailPreview(false);
                    setPreviewAgreement(null);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: textColor,
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: textColor
                }}>
                  Email Details
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      To
                    </label>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: textColor,
                      fontWeight: '500'
                    }}>
                      {previewAgreement.client.email}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Client Name
                    </label>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: textColor,
                      fontWeight: '500'
                    }}>
                      {previewAgreement.client.firstName} {previewAgreement.client.lastName}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Expires
                    </label>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: textColor,
                      fontWeight: '500'
                    }}>
                      {new Date(previewAgreement.expiresAt).toLocaleDateString('en-CA', {
                        timeZone: 'America/Toronto',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Template
                    </label>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: textColor,
                      fontWeight: '500'
                    }}>
                      {previewAgreement.template.title}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: textColor
                }}>
                  Email Content Preview
                </h3>
                <div style={{
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  padding: '20px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: textColor
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Subject:</strong> Your Photo Booth Agreement - {previewAgreement.client.firstName} {previewAgreement.client.lastName}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>From:</strong> Photobooth Guys &lt;info@photoboothguys.ca&gt;
                  </div>
                  <div style={{
                    borderTop: `1px solid ${borderColor}`,
                    paddingTop: '16px',
                    marginTop: '16px'
                  }}>
                    <p style={{ margin: '0 0 12px 0' }}>
                      Hi {previewAgreement.client.firstName},
                    </p>
                    <p style={{ margin: '0 0 12px 0' }}>
                      Your photo booth agreement is ready for review and signature. Please click the link below to view and sign your agreement.
                    </p>
                    <div style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      margin: '12px 0',
                      textDecoration: 'none',
                      fontWeight: '600'
                    }}>
                      View & Sign Agreement →
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      This agreement expires on {new Date(previewAgreement.expiresAt).toLocaleDateString('en-CA', {
                        timeZone: 'America/Toronto',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowEmailPreview(false);
                    setPreviewAgreement(null);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowEmailPreview(false);
                    setPreviewAgreement(null);
                    handleSendToClient(previewAgreement);
                  }}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
