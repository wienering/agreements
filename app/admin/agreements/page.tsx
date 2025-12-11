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
  viewCount?: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  selectedBackdropName?: string;
  paymentStatus?: string;
  showPhoneNumberAlways?: boolean;
  forceVirtualGreenScreen?: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    eventDate?: string; // Deprecated - fallback for legacy agreements
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
  // Set page title
  useEffect(() => {
    document.title = 'Agreements | Admin | Photobooth Guys';
  }, []);

  const hasFetchedData = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [filteredAgreements, setFilteredAgreements] = useState<Agreement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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
  const [galleryEmailSentAt, setGalleryEmailSentAt] = useState<Date | null>(null);
  const [sendingGalleryEmail, setSendingGalleryEmail] = useState(false);
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
  
  // Payment warning state
  const [showPaymentWarningModal, setShowPaymentWarningModal] = useState(false);
  const [completingAgreement, setCompletingAgreement] = useState<Agreement | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ agreementId: string; status: string } | null>(null);
  
  // Email preview state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewAgreement, setPreviewAgreement] = useState<Agreement | null>(null);
  
  // Invoice creation state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceAgreement, setInvoiceAgreement] = useState<Agreement | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount'>('default');
  const [customInvoiceAmount, setCustomInvoiceAmount] = useState<string>('');
  const [disableOnlinePayment, setDisableOnlinePayment] = useState<boolean>(false);
  
  // Attendant view modal state
  const [showAttendantModal, setShowAttendantModal] = useState(false);
  const [attendantModalAgreement, setAttendantModalAgreement] = useState<Agreement | null>(null);
  const [phoneVisibilityToggle, setPhoneVisibilityToggle] = useState(false);
  const [updatingPhoneVisibility, setUpdatingPhoneVisibility] = useState(false);
  const [virtualGreenScreenToggle, setVirtualGreenScreenToggle] = useState(false);
  const [updatingVirtualGreenScreen, setUpdatingVirtualGreenScreen] = useState(false);
  
  // Copy link modal state
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false);
  const [copyLinkAgreement, setCopyLinkAgreement] = useState<Agreement | null>(null);

// Normalize legacy/case-variant payment status values so the select always matches
const normalizePaymentStatus = (value?: string | null) => {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  if (v === 'fully paid' || v === 'paid in full' || v === 'paid') return 'Fully paid';
  if (v === 'balance due') return 'Balance due';
  if (v === 'deposit paid' || v === 'deposit') return 'Deposit paid';
  if (v === 'not paid' || v === 'unpaid') return 'Not paid';
  return value; // fall back to original to avoid losing data
};
  
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

  // Check if device is mobile or tablet
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1024); // iPad and similar tablets
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
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

  // Handle "/" key to focus search bar
  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      // Only trigger if "/" is pressed and user is not already typing in an input/textarea
      if (event.key === '/' && searchInputRef.current) {
        const target = event.target as HTMLElement;
        const isInputFocused = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.isContentEditable;
        
        // Don't trigger if user is already typing in an input field
        if (!isInputFocused) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Close modals in order of priority (most specific first)
        if (showAttendantModal) {
          setShowAttendantModal(false);
          setAttendantModalAgreement(null);
        } else if (showCopyLinkModal) {
          setShowCopyLinkModal(false);
          setCopyLinkAgreement(null);
        } else if (showEmailPreview) {
          setShowEmailPreview(false);
          setPreviewAgreement(null);
        } else if (showInvoiceModal) {
          setShowInvoiceModal(false);
          setInvoiceAgreement(null);
          setInvoiceResult(null);
          setInvoiceError(null);
        } else if (showCancelModal) {
          setShowCancelModal(false);
          setCancellingAgreement(null);
          setCancellationStep(1);
          setCancellationReason('');
          setAdminName('');
          setCancellationConfirm('');
        } else if (showPaymentWarningModal) {
          setShowPaymentWarningModal(false);
          setCompletingAgreement(null);
          setPendingStatusChange(null);
        } else if (editingStatus) {
          setEditingStatus(false);
          setEditingStatusAgreementId(null);
          setNewStatus('');
        } else if (editingExpiration) {
          setEditingExpiration(false);
          setEditingAgreementId(null);
          setNewExpirationDate('');
        } else if (selectedAgreement) {
          setSelectedAgreement(null);
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [
    showAttendantModal,
    showCopyLinkModal,
    showEmailPreview,
    showInvoiceModal,
    showCancelModal,
    showPaymentWarningModal,
    editingStatus,
    editingExpiration,
    selectedAgreement
  ]);

  // Filter agreements based on search term and status
  useEffect(() => {
    let filtered = agreements;
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(agreement => agreement.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(agreement => {
        // Search in client fields
        if (
          agreement.client.firstName.toLowerCase().includes(searchLower) ||
          agreement.client.lastName.toLowerCase().includes(searchLower) ||
          agreement.client.email.toLowerCase().includes(searchLower)
        ) {
          return true;
        }
        // Search in template title
        if (agreement.template.title.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in event fields
        if (agreement.event) {
          if (
            (agreement.event.eventType && agreement.event.eventType.toLowerCase().includes(searchLower)) ||
            (agreement.event.eventLocation && agreement.event.eventLocation.toLowerCase().includes(searchLower)) ||
            (agreement.event.eventPackage && agreement.event.eventPackage.toLowerCase().includes(searchLower))
          ) {
            return true;
          }
        }
        // Search in status
        if (agreement.status.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }
    
    setFilteredAgreements(filtered);
  }, [agreements, searchTerm, statusFilter]);

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

  // Get payment status styling
  const getPaymentStatusStyle = (paymentStatus?: string) => {
    if (!paymentStatus) {
      return {
        color: mutedText,
        backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
      };
    }
    
    const statusLower = paymentStatus.toLowerCase();
    if (statusLower.includes('paid') && !statusLower.includes('deposit')) {
      return {
        color: '#059669',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0'
      };
    } else if (statusLower.includes('deposit')) {
      return {
        color: '#d97706',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a'
      };
    } else if (statusLower.includes('not paid') || statusLower.includes('unpaid')) {
      return {
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca'
      };
    }
    
    return {
      color: mutedText,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
    };
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
    // Use customHtmlContent if available, otherwise fall back to template.htmlContent
    setEditingContent((agreement as any).customHtmlContent || agreement.template.htmlContent);
  // Load portal enhancement fields
  setPaymentStatus(normalizePaymentStatus((agreement as any).paymentStatus));
    setStripePaymentLink((agreement as any).stripePaymentLink || '');
    setStripeReceiptLink((agreement as any).stripeReceiptLink || '');
    setGalleryLink((agreement as any).galleryLink || '');
    setGalleryEmailSentAt((agreement as any).galleryEmailSentAt ? new Date((agreement as any).galleryEmailSentAt) : null);
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

  const handleSendGalleryReadyEmail = async () => {
    if (!selectedAgreement || !galleryLink) return;
    
    // Validate URL format
    try {
      new URL(galleryLink);
    } catch {
      showToast('Please enter a valid gallery link URL first', 'error');
      return;
    }
    
    try {
      setSendingGalleryEmail(true);
      const response = await fetch('/api/agreements/send-gallery-ready-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId: selectedAgreement.id }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Gallery ready email sent to ${selectedAgreement.client.email}!`);
        // Update the galleryEmailSentAt timestamp
        setGalleryEmailSentAt(new Date());
        // Refresh the agreements list to get updated data
        const refreshResponse = await fetch('/api/agreements');
        if (refreshResponse.ok) {
          const refreshedAgreements = await refreshResponse.json();
          setAgreements(refreshedAgreements);
          // Update selected agreement if it's still selected
          if (selectedAgreement) {
            const updatedAgreement = refreshedAgreements.find((a: Agreement) => a.id === selectedAgreement.id);
            if (updatedAgreement) {
              setSelectedAgreement(updatedAgreement);
              setGalleryEmailSentAt(updatedAgreement.galleryEmailSentAt ? new Date(updatedAgreement.galleryEmailSentAt) : null);
            }
          }
        }
      } else {
        showToast(`Error: ${data.error || 'Failed to send gallery ready email'}`, 'error');
      }
    } catch (error) {
      console.error('Error sending gallery ready email:', error);
      showToast('Failed to send gallery ready email. Please try again later.', 'error');
    } finally {
      setSendingGalleryEmail(false);
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

    // Check if trying to complete an agreement that isn't fully paid
    if (newStatus === 'COMPLETED') {
      const agreement = agreements.find(a => a.id === agreementId);
      if (agreement && agreement.paymentStatus?.toLowerCase() !== 'fully paid') {
        // Show payment warning modal
        setCompletingAgreement(agreement);
        setPendingStatusChange({ agreementId, status: newStatus });
        setShowPaymentWarningModal(true);
        return;
      }
    }

    // Proceed with status update
    await proceedWithStatusUpdate(agreementId, newStatus);
  };

  const proceedWithStatusUpdate = async (agreementId: string, status: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/agreements/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: agreementId, 
          status: status 
        }),
      });

      if (response.ok) {
        const updatedAgreement = await response.json();
        
        // Update the agreement status in the list (COMPLETED agreements stay visible)
        setAgreements(agreements.map(a => 
          a.id === agreementId ? { ...a, status: updatedAgreement.status } : a
        ));
        if (status === 'COMPLETED') {
          showToast('Agreement marked as completed! Client still has portal access.');
        } else {
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

  const handleConfirmPaymentWarning = async () => {
    if (!pendingStatusChange) return;
    
    setShowPaymentWarningModal(false);
    await proceedWithStatusUpdate(pendingStatusChange.agreementId, pendingStatusChange.status);
    setCompletingAgreement(null);
    setPendingStatusChange(null);
  };

  const handleCancelPaymentWarning = () => {
    setShowPaymentWarningModal(false);
    setCompletingAgreement(null);
    setPendingStatusChange(null);
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
    setCustomInvoiceAmount('');
    setDisableOnlinePayment(false);
  };

  const handleConfirmCreateInvoice = async () => {
    if (!invoiceAgreement) return;

    try {
      setCreatingInvoice(true);
      setInvoiceError(null);
      setInvoiceResult(null);

      const requestBody: any = {
        agreementId: invoiceAgreement.id,
        invoiceType: invoiceType,
        disableOnlinePayment: disableOnlinePayment,
      };

      // Add custom amount if invoice type is custom-amount
      if (invoiceType === 'custom-amount' && customInvoiceAmount) {
        const amount = parseFloat(customInvoiceAmount);
        if (isNaN(amount) || amount <= 0) {
          setInvoiceError('Please enter a valid custom amount greater than 0');
          showToast('Please enter a valid custom amount', 'error');
          setCreatingInvoice(false);
          return;
        }
        requestBody.customAmount = amount;
      }

      const response = await fetch('/api/agreements/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
    setCustomInvoiceAmount('');
    setDisableOnlinePayment(false);
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

        {/* Search Bar */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flex: 1,
              width: isMobile ? '100%' : 'auto'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                style={{ color: mutedText }}
              >
                <path 
                  d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16ZM19 19l-4.35-4.35" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search agreements by client name, email, template, event details, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  backgroundColor: mainBg,
                  color: textColor,
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                }}
              />
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: textColor,
            marginRight: '4px'
          }}>
            Filter by Status:
          </span>
          {['ALL', 'DRAFT', 'LIVE', 'SENT', 'SIGNED', 'COMPLETED', 'CANCELLED'].map((status) => {
            const isActive = statusFilter === status;
            const getStatusColor = (s: string) => {
              switch (s) {
                case 'DRAFT': return '#dc2626';
                case 'LIVE': return '#059669';
                case 'SENT': return '#3b82f6';
                case 'SIGNED': return '#2563eb';
                case 'COMPLETED': return '#7c3aed';
                case 'CANCELLED': return '#dc2626';
                default: return '#6b7280';
              }
            };
            const getStatusBgColor = (s: string) => {
              switch (s) {
                case 'DRAFT': return '#fef2f2';
                case 'LIVE': return '#f0fdf4';
                case 'SENT': return '#eff6ff';
                case 'SIGNED': return '#eff6ff';
                case 'COMPLETED': return '#faf5ff';
                case 'CANCELLED': return '#fef2f2';
                default: return isDark ? '#1e293b' : '#f1f5f9';
              }
            };
            
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isActive ? getStatusColor(status) : borderColor}`,
                  backgroundColor: isActive ? getStatusBgColor(status) : (isDark ? '#1e293b' : '#f1f5f9'),
                  color: isActive ? getStatusColor(status) : textColor,
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                  }
                }}
              >
                {status}
              </button>
            );
          })}
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
        {filteredAgreements.length === 0 ? (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: mutedText, fontSize: '16px' }}>
              {searchTerm.trim() 
                ? `No agreements found matching "${searchTerm}".` 
                : 'No agreements found. Create your first agreement to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* Active Agreements Section */}
            {filteredAgreements.filter(a => a.status !== 'COMPLETED').length > 0 && (
              <>
                {statusFilter === 'ALL' && filteredAgreements.some(a => a.status === 'COMPLETED') && (
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: textColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📋 Active Agreements
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '400', 
                      color: mutedText 
                    }}>
                      ({filteredAgreements.filter(a => a.status !== 'COMPLETED').length})
                    </span>
                  </h3>
                )}
                <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
                  {filteredAgreements.filter(a => a.status !== 'COMPLETED').map(agreement => {
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
                {(() => {
                  const daysSinceEmailed = agreement.status === 'LIVE' && agreement.lastEmailedAt 
                    ? Math.floor((Date.now() - new Date(agreement.lastEmailedAt).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isUnresponsive = daysSinceEmailed !== null && daysSinceEmailed >= 3;
                  const needsPersonalFollowUp = daysSinceEmailed !== null && daysSinceEmailed >= 5;
                  
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
                        gap: '4px',
                        maxWidth: 'calc(100% - 16px)'
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
                  gap: isMobile ? '12px' : '0',
                  paddingTop: (agreement.status === 'LIVE' && agreement.lastEmailedAt && 
                    Math.floor((Date.now() - new Date(agreement.lastEmailedAt).getTime()) / (1000 * 60 * 60 * 24)) >= 3) 
                    ? '36px' : '0'
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
                      // Remove any existing tooltips first (cleanup)
                      document.querySelectorAll('.engagement-tooltip').forEach(t => t.remove());
                      
                      // Show engagement tooltip
                      const tooltip = document.createElement('div');
                      tooltip.className = 'engagement-tooltip';
                      
                      const daysSinceEmailed = agreement.lastEmailedAt ? 
                        Math.floor((Date.now() - new Date(agreement.lastEmailedAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
                      
                      const viewCount = agreement.viewCount || 0;
                      const lastViewed = agreement.lastViewedAt ? new Date(agreement.lastViewedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : null;
                      
                      // Status colors
                      const statusColor = agreement.status === 'SIGNED' ? '#10b981' : 
                                         agreement.status === 'LIVE' ? '#3b82f6' : 
                                         agreement.status === 'DRAFT' ? '#f59e0b' : 
                                         agreement.status === 'COMPLETED' ? '#8b5cf6' :
                                         agreement.status === 'CANCELLED' ? '#ef4444' : '#6b7280';
                      
                      const needsFollowUp = agreement.status === 'LIVE' && daysSinceEmailed && daysSinceEmailed >= 3;
                      const notViewed = viewCount === 0;
                      const bgColor = isDark ? '#1e293b' : '#ffffff';
                      const borderCol = isDark ? '#334155' : '#e2e8f0';
                      const textCol = isDark ? '#f1f5f9' : '#1e293b';
                      const mutedCol = isDark ? '#94a3b8' : '#64748b';
                      const iconBg = isDark ? '#334155' : '#e2e8f0';
                      
                      tooltip.style.cssText = 'position: absolute; top: 50%; left: 100%; transform: translateY(-50%); margin-left: 12px; background: ' + bgColor + '; border: 1px solid ' + borderCol + '; border-radius: 12px; padding: 0; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); z-index: 1000; min-width: 240px; font-size: 13px; color: ' + textCol + '; overflow: hidden;';
                      
                      const lastEmailText = agreement.lastEmailedAt ? 'Last: ' + new Date(agreement.lastEmailedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : 'Never emailed';
                      const lastViewText = lastViewed ? 'Last: ' + lastViewed : 'Never viewed';
                      
                      let followUpHtml = '';
                      if (needsFollowUp) {
                        followUpHtml = '<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 8px;"><span style="font-size: 14px;">🔔</span><div><div style="font-weight: 600; font-size: 12px; color: #92400e;">Follow-up needed</div><div style="font-size: 11px; color: #a16207;">' + daysSinceEmailed + ' days since last email</div></div></div>';
                      }
                      
                      tooltip.innerHTML = '<div style="position: absolute; left: -6px; top: 50%; width: 12px; height: 12px; background: ' + bgColor + '; border-left: 1px solid ' + borderCol + '; border-bottom: 1px solid ' + borderCol + '; transform: translateY(-50%) rotate(45deg);"></div>' +
                        '<div style="background: linear-gradient(135deg, ' + statusColor + '22 0%, ' + statusColor + '11 100%); border-bottom: 1px solid ' + borderCol + '; padding: 12px 16px; display: flex; align-items: center; gap: 8px;">' +
                          '<span style="font-size: 16px;">📊</span>' +
                          '<span style="font-weight: 700; font-size: 14px; color: ' + textCol + ';">Engagement</span>' +
                          '<span style="margin-left: auto; padding: 3px 8px; background: ' + statusColor + '; color: white; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">' + agreement.status + '</span>' +
                        '</div>' +
                        '<div style="padding: 14px 16px;">' +
                          '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">' +
                            '<div style="width: 32px; height: 32px; background: ' + iconBg + '; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">📧</div>' +
                            '<div style="flex: 1;"><div style="font-weight: 600; font-size: 14px; color: ' + textCol + ';">' + (agreement.emailSendCount || 0) + ' email' + (agreement.emailSendCount !== 1 ? 's' : '') + ' sent</div><div style="font-size: 11px; color: ' + mutedCol + ';">' + lastEmailText + '</div></div>' +
                          '</div>' +
                          '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: ' + (needsFollowUp || notViewed ? '12px' : '0') + ';">' +
                            '<div style="width: 32px; height: 32px; background: ' + (notViewed ? '#fef3c7' : iconBg) + '; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">' + (notViewed ? '⚠️' : '👁️') + '</div>' +
                            '<div style="flex: 1;"><div style="font-weight: 600; font-size: 14px; color: ' + (notViewed ? '#f59e0b' : textCol) + ';">' + viewCount + ' view' + (viewCount !== 1 ? 's' : '') + (notViewed ? ' - Not viewed!' : '') + '</div><div style="font-size: 11px; color: ' + mutedCol + ';">' + lastViewText + '</div></div>' +
                          '</div>' +
                          followUpHtml +
                        '</div>';
                      
                      e.currentTarget.appendChild(tooltip);
                    }}
                    onMouseLeave={(e) => {
                      // Remove tooltip from this element
                      const tooltip = e.currentTarget.querySelector('.engagement-tooltip');
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
                    {(agreement as any).backdropLink?.name && (
                      <p style={{ margin: '4px 0 0 0', color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>
                        🔗 Backdrop Link: {(agreement as any).backdropLink.name}
                      </p>
                    )}
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
                    {(agreement.event?.eventDate || agreement.client.eventDate) && (
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
                        Event {new Date(agreement.event?.eventDate || agreement.client.eventDate!).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}
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
                    {agreement.paymentStatus && (
                      <span style={{ 
                        fontSize: '12px', 
                        ...getPaymentStatusStyle(agreement.paymentStatus),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        alignSelf: isMobile ? 'flex-start' : 'auto',
                        fontWeight: '500'
                      }}
                      title="Payment status"
                      >
                        💳 {agreement.paymentStatus}
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
                      setCopyLinkAgreement(agreement);
                      setShowCopyLinkModal(true);
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
                    title="View agreement options"
                  >
                    View Agreement
                  </button>
                  <button
                    onClick={() => {
                      setAttendantModalAgreement(agreement);
                      setPhoneVisibilityToggle(agreement.showPhoneNumberAlways || false);
                      setVirtualGreenScreenToggle(agreement.forceVirtualGreenScreen || false);
                      setShowAttendantModal(true);
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
              </>
            )}

            {/* Completed Agreements Section */}
            {filteredAgreements.filter(a => a.status === 'COMPLETED').length > 0 && (
              <>
                {statusFilter === 'ALL' && filteredAgreements.some(a => a.status !== 'COMPLETED') && (
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ✅ Completed Agreements
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '400', 
                      color: mutedText 
                    }}>
                      ({filteredAgreements.filter(a => a.status === 'COMPLETED').length})
                    </span>
                  </h3>
                )}
                <div style={{ display: 'grid', gap: '16px' }}>
                  {filteredAgreements.filter(a => a.status === 'COMPLETED').map(agreement => {
                    const warningType = getAgreementWarningType(agreement);
                    const getWarningBorderStyle = () => {
                      if (warningType === 'expiration') {
                        return '3px solid #dc2626';
                      } else if (warningType === 'critical') {
                        return '3px solid #dc2626';
                      } else if (warningType === 'warning') {
                        return '3px solid #f59e0b';
                      }
                      return `1px solid ${borderColor}`;
                    };

                    return (
                      <div key={agreement.id} style={{
                        backgroundColor: cardBg,
                        border: `2px solid #7c3aed`,
                        borderRadius: '8px',
                        padding: '20px',
                        position: 'relative',
                        opacity: 0.9
                      }}>
                        {/* Completed Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '16px',
                          backgroundColor: '#7c3aed',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          Completed
                        </div>

                        {/* Agreement Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '16px',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: textColor }}>
                              {agreement.client.firstName} {agreement.client.lastName}
                            </h3>
                            <p style={{ margin: '0', fontSize: '14px', color: mutedText }}>
                              {agreement.client.email}
                            </p>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            flexWrap: 'wrap' 
                          }}>
                            <span style={{
                              backgroundColor: '#f3e8ff',
                              color: '#7c3aed',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {agreement.status}
                            </span>
                          </div>
                        </div>

                        {/* Agreement Details */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <span style={{ fontSize: '12px', color: mutedText }}>Template</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: textColor }}>
                              {agreement.template.title}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: mutedText }}>Event Date</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: textColor }}>
                              {agreement.event?.eventDate 
                                ? new Date(agreement.event.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
                                : agreement.client.eventDate 
                                  ? new Date(agreement.client.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
                                  : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: mutedText }}>Signed</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: textColor }}>
                              {agreement.signedAt 
                                ? new Date(agreement.signedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
                                : 'Not signed'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            onClick={() => {
                              setCopyLinkAgreement(agreement);
                              setShowCopyLinkModal(true);
                            }}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            View Agreement
                          </button>
                          <button
                            onClick={() => handleEditAgreement(agreement)}
                            style={{
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            Edit Details
                          </button>
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
                              fontWeight: '500'
                            }}
                            title="Archive this completed agreement"
                          >
                            {archivingAgreement[agreement.id] ? 'Archiving...' : 'Archive'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Edit Modal */}
        {selectedAgreement && !showAttendantModal && !showCopyLinkModal && (
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
                  {galleryLink && (
                    <>
                      <button
                        type="button"
                        onClick={handleSendGalleryReadyEmail}
                        disabled={sendingGalleryEmail || !galleryLink}
                        style={{
                          marginTop: '8px',
                          padding: '8px 16px',
                          backgroundColor: sendingGalleryEmail ? '#9ca3af' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: sendingGalleryEmail ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {sendingGalleryEmail ? (
                          <>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '14px', 
                              height: '14px', 
                              border: '2px solid white', 
                              borderTopColor: 'transparent', 
                              borderRadius: '50%', 
                              animation: 'spin 1s linear infinite' 
                            }} />
                            Sending...
                          </>
                        ) : (
                          <>
                            📧 Send Gallery Ready Email
                          </>
                        )}
                      </button>
                      {galleryEmailSentAt && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '10px 12px',
                            backgroundColor: '#dbeafe',
                            border: '1px solid #93c5fd',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#1e40af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✓</span>
                          <span>
                            <strong>Email sent to client</strong> on {galleryEmailSentAt.toLocaleDateString('en-CA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
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
                    Attendant
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
                          <option value="No Backdrop">No Backdrop</option>
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
                flexWrap: 'wrap',
                gap: (isMobile || isTablet) ? '8px' : '10px', 
                justifyContent: 'center',
                paddingTop: '16px',
                borderTop: `1px solid ${borderColor}`,
                paddingLeft: (isMobile || isTablet) ? '8px' : '4px',
                paddingRight: (isMobile || isTablet) ? '8px' : '4px'
              }}>
                <button
                  onClick={handleSaveAgreement}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
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
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Open client view in new tab"
                >
                  {(isMobile || isTablet) ? 'Preview' : 'Preview Client View'}
                </button>
                <button
                  onClick={() => {
                    if (selectedAgreement?.id) {
                      setPhoneVisibilityToggle(selectedAgreement.showPhoneNumberAlways || false);
                      setVirtualGreenScreenToggle(selectedAgreement.forceVirtualGreenScreen || false);
                      setShowAttendantModal(true);
                    }
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
                  }}
                  title="View attendant page (event details for staff)"
                >
                  {(isMobile || isTablet) ? '👥 Attendant' : '👥 Attendant View'}
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
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
                  }}
                  title="View client portal (admin preview)"
                  disabled={!selectedAgreement?.client?.email}
                >
                  {(isMobile || isTablet) ? '🔍 Portal' : '🔍 View Client Portal'}
                </button>
                <button
                  onClick={() => handlePreviewEmail(selectedAgreement)}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Preview the email that will be sent to the client"
                >
                  {(isMobile || isTablet) ? '📧 Email' : '📧 Preview Email'}
                </button>
                <button
                  onClick={() => handleSendToClient(selectedAgreement)}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: (isMobile || isTablet) ? '8px 12px' : '10px 20px',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: (isMobile || isTablet) ? '13px' : '14px',
                    fontWeight: '500',
                    flex: (isMobile || isTablet) ? '1 1 calc(50% - 4px)' : '1 1 auto',
                    minWidth: (isMobile || isTablet) ? '0' : '140px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Send this agreement to the client"
                >
                  {loading ? 'Sending...' : ((isMobile || isTablet) ? 'Send' : 'Send to Client')}
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

        {/* Payment Warning Modal */}
        {showPaymentWarningModal && completingAgreement && (
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
                <span style={{ color: '#f59e0b' }}>⚠️</span>
                Payment Warning
              </h3>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 16px 0', color: textColor, fontSize: '16px', lineHeight: '1.5' }}>
                  You are about to mark this agreement as <strong>COMPLETED</strong>, but the payment status is not fully paid.
                </p>
                
                <div style={{
                  padding: '12px',
                  backgroundColor: isDark ? '#1e293b' : '#fef3c7',
                  border: `1px solid ${isDark ? '#334155' : '#fde68a'}`,
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 8px 0', color: textColor, fontSize: '14px', fontWeight: '600' }}>
                    Agreement Details:
                  </p>
                  <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                    <strong>Client:</strong> {completingAgreement.client.firstName} {completingAgreement.client.lastName}
                  </p>
                  <p style={{ margin: '0 0 4px 0', color: textColor, fontSize: '14px' }}>
                    <strong>Template:</strong> {completingAgreement.template.title}
                  </p>
                  <p style={{ margin: '0', color: textColor, fontSize: '14px' }}>
                    <strong>Current Payment Status:</strong> <span style={{ color: '#f59e0b', fontWeight: '600' }}>{completingAgreement.paymentStatus || 'Not Set'}</span>
                  </p>
                </div>

                <p style={{ margin: '0', color: textColor, fontSize: '14px', lineHeight: '1.5' }}>
                  Are you sure you want to proceed with marking this agreement as completed?
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  onClick={handleCancelPaymentWarning}
                  style={{
                    backgroundColor: '#6b7280',
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
                    e.currentTarget.style.backgroundColor = '#4b5563';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6b7280';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPaymentWarning}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#f59e0b';
                    }
                  }}
                >
                  {saving ? 'Completing...' : 'Yes, Complete Anyway'}
                </button>
              </div>
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
                          Invoice Amount
                        </label>
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: textColor,
                          fontWeight: '500'
                        }}>
                          {invoiceAgreement.event?.packagePrice || (invoiceAgreement.client as any).packagePrice 
                            ? `$${Number(invoiceAgreement.event?.packagePrice || (invoiceAgreement.client as any).packagePrice || 0).toFixed(2)}`
                            : 'Not set'}
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
                      onChange={(e) => {
                        setInvoiceType(e.target.value as 'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount');
                        if (e.target.value !== 'custom-amount') {
                          setCustomInvoiceAmount('');
                        }
                      }}
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
                      <option value="total-minus-deposit">Total Amount Minus $100 Deposit</option>
                      <option value="custom-amount">Custom Amount</option>
                    </select>
                  </div>

                  <div style={{
                    marginBottom: '24px'
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={disableOnlinePayment}
                        onChange={(e) => setDisableOnlinePayment(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        fontSize: '14px',
                        color: textColor,
                        fontWeight: '500'
                      }}>
                        Disable online payment (invoice will be view-only)
                      </span>
                    </label>
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '12px',
                      color: mutedText
                    }}>
                      When enabled, clients will receive the invoice but won&apos;t be able to pay online. You can send payment instructions separately.
                    </p>
                  </div>

                  {invoiceType === 'custom-amount' && (
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
                        Custom Invoice Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customInvoiceAmount}
                        onChange={(e) => setCustomInvoiceAmount(e.target.value)}
                        placeholder="Enter amount (e.g., 650.00)"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          backgroundColor: cardBg,
                          color: textColor,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                      {invoiceAgreement && (invoiceAgreement.event?.packagePrice || (invoiceAgreement.client as any).packagePrice) && (
                        <p style={{
                          margin: '8px 0 0 0',
                          fontSize: '12px',
                          color: mutedText
                        }}>
                          Total package price: ${Number(invoiceAgreement.event?.packagePrice || (invoiceAgreement.client as any).packagePrice || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

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
                      ) : invoiceType === 'total-only' ? (
                        <>
                          <br />
                          A single invoice will be created for the full amount, due 1 week before the event date.
                        </>
                      ) : invoiceType === 'total-minus-deposit' ? (
                        <>
                          <br />
                          A single invoice will be created for the total amount minus $100 (assuming deposit was paid outside of Stripe), due 1 week before the event date.
                        </>
                      ) : (
                        <>
                          <br />
                          A single invoice will be created for the custom amount you specify, due 1 week before the event date.
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
                      disabled={!invoiceAgreement.client.email || (invoiceType === 'custom-amount' && !customInvoiceAmount)}
                      style={{
                        backgroundColor: (!invoiceAgreement.client.email || (invoiceType === 'custom-amount' && !customInvoiceAmount)) ? '#9ca3af' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: (!invoiceAgreement.client.email || (invoiceType === 'custom-amount' && !customInvoiceAmount)) ? 'not-allowed' : 'pointer',
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

        {/* Attendant View Modal */}
        {showAttendantModal && (attendantModalAgreement || selectedAgreement) && (
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
          }}
          onClick={() => {
            setShowAttendantModal(false);
            setAttendantModalAgreement(null);
            setPhoneVisibilityToggle(false);
          }}
          >
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                color: textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                👥 Attendant View Options
              </h3>
              <p style={{ 
                margin: '0 0 20px 0', 
                color: mutedText,
                fontSize: '14px'
              }}>
                Choose an action for the attendant view page
              </p>
              
              {/* Phone Number Visibility Toggle */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    color: textColor,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📞 Always Show Phone Number
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const agreement = attendantModalAgreement || selectedAgreement;
                      if (!agreement?.id) return;
                      
                      const newValue = !phoneVisibilityToggle;
                      setUpdatingPhoneVisibility(true);
                      
                      try {
                        const response = await fetch('/api/agreements/update-phone-visibility', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            agreementId: agreement.id,
                            showPhoneNumberAlways: newValue
                          })
                        });
                        
                        if (response.ok) {
                          setPhoneVisibilityToggle(newValue);
                          // Update the agreement in state
                          if (attendantModalAgreement) {
                            setAttendantModalAgreement({ ...attendantModalAgreement, showPhoneNumberAlways: newValue });
                          }
                          if (selectedAgreement) {
                            setSelectedAgreement({ ...selectedAgreement, showPhoneNumberAlways: newValue });
                          }
                          // Update in agreements list
                          setAgreements(prev => prev.map(a => 
                            a.id === agreement.id ? { ...a, showPhoneNumberAlways: newValue } : a
                          ));
                          showToast(newValue ? 'Phone number will always be visible' : 'Phone number visibility set to default (24 hours before event)', 'success');
                        } else {
                          showToast('Failed to update phone visibility', 'error');
                        }
                      } catch (error) {
                        console.error('Error updating phone visibility:', error);
                        showToast('Failed to update phone visibility', 'error');
                      } finally {
                        setUpdatingPhoneVisibility(false);
                      }
                    }}
                    disabled={updatingPhoneVisibility}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: phoneVisibilityToggle ? '#059669' : (isDark ? '#475569' : '#cbd5e1'),
                      border: 'none',
                      cursor: updatingPhoneVisibility ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      opacity: updatingPhoneVisibility ? 0.6 : 1
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: phoneVisibilityToggle ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>
                <p style={{
                  margin: '0',
                  fontSize: '12px',
                  color: mutedText
                }}>
                  {phoneVisibilityToggle 
                    ? 'Phone number will be visible on the attendant page regardless of event time'
                    : 'Phone number will only be visible 24 hours before the event starts (default)'}
                </p>
              </div>

              {/* Virtual Green Screen Toggle */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    color: textColor,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎬 Force Virtual Green Screen
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const agreement = attendantModalAgreement || selectedAgreement;
                      if (!agreement?.id) return;
                      
                      const newValue = !virtualGreenScreenToggle;
                      setUpdatingVirtualGreenScreen(true);
                      
                      try {
                        const response = await fetch('/api/agreements/update-virtual-green-screen', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            agreementId: agreement.id,
                            forceVirtualGreenScreen: newValue
                          })
                        });
                        
                        if (response.ok) {
                          setVirtualGreenScreenToggle(newValue);
                          // Update the agreement in state
                          if (attendantModalAgreement) {
                            setAttendantModalAgreement({ ...attendantModalAgreement, forceVirtualGreenScreen: newValue });
                          }
                          if (selectedAgreement) {
                            setSelectedAgreement({ ...selectedAgreement, forceVirtualGreenScreen: newValue });
                          }
                          // Update in agreements list
                          setAgreements(prev => prev.map(a => 
                            a.id === agreement.id ? { ...a, forceVirtualGreenScreen: newValue } : a
                          ));
                          showToast(newValue ? 'Virtual Green Screen will be displayed on attendant page' : 'Backdrop selection will behave normally', 'success');
                        } else {
                          showToast('Failed to update virtual green screen override', 'error');
                        }
                      } catch (error) {
                        console.error('Error updating virtual green screen override:', error);
                        showToast('Failed to update virtual green screen override', 'error');
                      } finally {
                        setUpdatingVirtualGreenScreen(false);
                      }
                    }}
                    disabled={updatingVirtualGreenScreen}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: virtualGreenScreenToggle ? '#059669' : (isDark ? '#475569' : '#cbd5e1'),
                      border: 'none',
                      cursor: updatingVirtualGreenScreen ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      opacity: updatingVirtualGreenScreen ? 0.6 : 1
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: virtualGreenScreenToggle ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>
                <p style={{
                  margin: '0',
                  fontSize: '12px',
                  color: mutedText
                }}>
                  {virtualGreenScreenToggle 
                    ? 'Virtual Green Screen will override the selected backdrop on the attendant page'
                    : 'Backdrop selection will behave normally (no override)'}
                </p>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px'
              }}>
                <button
                  onClick={() => {
                    const agreement = attendantModalAgreement || selectedAgreement;
                    if (agreement?.id) {
                      const attendantLink = `${window.location.origin}/attendant/${agreement.id}`;
                      navigator.clipboard.writeText(attendantLink).then(() => {
                        showToast('Link copied to clipboard!', 'success');
                        setShowAttendantModal(false);
                        setAttendantModalAgreement(null);
                      }).catch(() => {
                        showToast('Failed to copy link', 'error');
                      });
                    }
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  📋 Copy Link
                </button>
                <button
                  onClick={() => {
                    const agreement = attendantModalAgreement || selectedAgreement;
                    if (agreement?.id) {
                      const attendantLink = `${window.location.origin}/attendant/${agreement.id}`;
                      window.open(attendantLink, '_blank');
                      setShowAttendantModal(false);
                      setAttendantModalAgreement(null);
                    }
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  👁️ View Page
                </button>
                <button
                  onClick={() => {
                    setShowAttendantModal(false);
                    setAttendantModalAgreement(null);
                    setPhoneVisibilityToggle(false);
                    setVirtualGreenScreenToggle(false);
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Agreement Modal */}
        {showCopyLinkModal && copyLinkAgreement && (
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
          }}
          onClick={() => {
            setShowCopyLinkModal(false);
            setCopyLinkAgreement(null);
          }}
          >
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                color: textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📄 View Agreement
              </h3>
              <p style={{ 
                margin: '0 0 20px 0', 
                color: mutedText,
                fontSize: '14px'
              }}>
                Choose how to view or share this agreement
              </p>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px'
              }}>
                <button
                  onClick={() => {
                    if (copyLinkAgreement?.uniqueToken) {
                      const adminPreviewLink = `${window.location.origin}/admin/preview/${copyLinkAgreement.uniqueToken}`;
                      window.open(adminPreviewLink, '_blank');
                      setShowCopyLinkModal(false);
                      setCopyLinkAgreement(null);
                    }
                  }}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  🔐 Admin View
                </button>
                <button
                  onClick={() => {
                    if (copyLinkAgreement?.uniqueToken) {
                      const clientLink = `${window.location.origin}/agreement/${copyLinkAgreement.uniqueToken}`;
                      window.open(clientLink, '_blank');
                      setShowCopyLinkModal(false);
                      setCopyLinkAgreement(null);
                    }
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  👁️ Client View
                </button>
                <button
                  onClick={() => {
                    if (copyLinkAgreement?.uniqueToken) {
                      const clientLink = `${window.location.origin}/agreement/${copyLinkAgreement.uniqueToken}`;
                      navigator.clipboard.writeText(clientLink).then(() => {
                        showToast('Link copied to clipboard!', 'success');
                        setShowCopyLinkModal(false);
                        setCopyLinkAgreement(null);
                      }).catch(() => {
                        showToast('Failed to copy link', 'error');
                      });
                    }
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  📋 Copy Client Link
                </button>
                <button
                  onClick={() => {
                    setShowCopyLinkModal(false);
                    setCopyLinkAgreement(null);
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
