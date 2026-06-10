'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { UIcon } from '../../components/UIcon';

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
}

/** Hour-based packages from pricing table */
type StandardPackage = { kind: 'standard'; hours: number; price: number };

/** Free-form package (multi-day, custom duration text, etc.) — no fixed hours */
type CustomPackage = {
  kind: 'custom';
  title: string;
  description: string;
  price: number;
};

type SelectedPackage = StandardPackage | CustomPackage;

interface Addons {
  unlimitedPrints: boolean;
  glamBooth: boolean;
  waitingTime: boolean;
  waitingHours: number;
}

interface Discount {
  note: string;
  amount: number;
}

interface QuoteOptionDraft {
  selectedPackage: SelectedPackage | null;
  customPackageDraft: {
    title: string;
    description: string;
    price: string;
  };
  addons: Addons;
  discount: Discount;
  packageOverrides: PackageOverrides;
}

interface ComputedQuoteOption {
  package: SelectedPackage;
  addons: Addons;
  discount: Discount | null;
  subtotal: number;
  total: number;
}

interface PackageOverrides {
  [key: number]: number | null;
}

interface PricingConfig {
  packages: {
    [key: number]: number;
  };
  unlimitedPrints: {
    short: number;
    long: number;
  };
  glamBooth: number;
  waitingTime: number;
}

const DEFAULT_PRICING: PricingConfig = {
  packages: {
    2: 550,
    3: 750,
    4: 950,
    5: 1150,
    6: 1350
  },
  unlimitedPrints: {
    short: 60,
    long: 50
  },
  glamBooth: 75,
  waitingTime: 50
};

const createEmptyOptionDraft = (): QuoteOptionDraft => ({
  selectedPackage: null,
  customPackageDraft: { title: '', description: '', price: '' },
  addons: {
    unlimitedPrints: false,
    glamBooth: false,
    waitingTime: false,
    waitingHours: 0,
  },
  discount: { note: '', amount: 0 },
  packageOverrides: {},
});

function calculateUnlimitedPrintsPriceForDraft(
  draft: QuoteOptionDraft,
  pricing: PricingConfig
): number {
  const { selectedPackage, addons } = draft;
  if (!selectedPackage || selectedPackage.kind !== 'standard' || !addons.unlimitedPrints) return 0;
  const isShortPackage = selectedPackage.hours <= 3;
  const ratePerHour = isShortPackage ? pricing.unlimitedPrints.short : pricing.unlimitedPrints.long;
  return ratePerHour * selectedPackage.hours;
}

function calculateWaitingTimePriceForDraft(draft: QuoteOptionDraft, pricing: PricingConfig): number {
  if (!draft.addons.waitingTime || draft.addons.waitingHours === 0) return 0;
  return pricing.waitingTime * draft.addons.waitingHours;
}

function calculateSubtotalForDraft(draft: QuoteOptionDraft, pricing: PricingConfig): number {
  if (!draft.selectedPackage) return 0;
  let subtotal = draft.selectedPackage.price;
  subtotal += calculateUnlimitedPrintsPriceForDraft(draft, pricing);
  if (draft.addons.glamBooth) subtotal += pricing.glamBooth;
  subtotal += calculateWaitingTimePriceForDraft(draft, pricing);
  return subtotal;
}

function calculateTotalForDraft(draft: QuoteOptionDraft, pricing: PricingConfig): number {
  const subtotal = calculateSubtotalForDraft(draft, pricing);
  const discountAmount = draft.discount.amount > 0 ? draft.discount.amount : 0;
  return Math.max(0, subtotal - discountAmount);
}

function buildComputedOption(draft: QuoteOptionDraft, pricing: PricingConfig): ComputedQuoteOption | null {
  if (!draft.selectedPackage) return null;
  return {
    package: draft.selectedPackage,
    addons: draft.addons,
    discount: draft.discount.amount > 0 ? draft.discount : null,
    subtotal: calculateSubtotalForDraft(draft, pricing),
    total: calculateTotalForDraft(draft, pricing),
  };
}

export default function QuotesPage() {
  const searchParams = useSearchParams();

  // Set page title
  useEffect(() => {
    document.title = 'Quotes | Admin | Photobooth Guys';
  }, []);

  const { isDark } = useDarkMode();
  const [currentStep, setCurrentStep] = useState(1);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    eventDate: ''
  });
  const [compareTwoPackages, setCompareTwoPackages] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<[QuoteOptionDraft, QuoteOptionDraft]>([
    createEmptyOptionDraft(),
    createEmptyOptionDraft(),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [editablePricing, setEditablePricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMessage, setPricingMessage] = useState('');

  // Fetch pricing from database on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await adminFetch('/api/quotes/pricing');
        if (response.ok) {
          const data = await response.json();
          setPricing(data);
          setEditablePricing(data);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      }
    };
    fetchPricing();
  }, []);

  const mainBg = isDark ? '#080c08' : '#f8fafc';
  const cardBg = isDark ? '#1a1d1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const mutedText = isDark ? '#8f9a8f' : '#64748b';
  const borderColor = isDark ? '#2d3530' : '#e2e8f0';
  const accentColor = 'var(--accent)';

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      return `(${digits}`;
    }
    return '';
  };

  // Pre-fill contact info from URL params (e.g. when navigated from Leads page)
  useEffect(() => {
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const eventDate = searchParams.get('eventDate');
    if (name || email || phone || eventDate) {
      const formattedPhone = phone ? formatPhoneNumber(phone) : '';
      setContactInfo((prev) => ({
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        phone: formattedPhone || prev.phone,
        eventDate: eventDate || prev.eventDate,
      }));
      if (phone) setPhoneValue(formatPhoneNumber(phone));
    }
  }, [searchParams]);

  const formatEventDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Only validate email format if provided, but don't require it
    if (contactInfo.email.trim() && !isValidEmail(contactInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    // Only validate event date if provided
    if (contactInfo.eventDate && new Date(contactInfo.eventDate) < new Date()) {
      newErrors.eventDate = 'Event date must be in the future';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setContactInfo({
        ...contactInfo,
        eventDate: contactInfo.eventDate ? formatEventDate(contactInfo.eventDate) : contactInfo.eventDate
      });
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateOptionDraft = (
    index: 0 | 1,
    updater: (draft: QuoteOptionDraft) => QuoteOptionDraft
  ) => {
    setOptionDrafts((prev) => {
      const next: [QuoteOptionDraft, QuoteOptionDraft] = [prev[0], prev[1]];
      next[index] = updater(prev[index]);
      return next;
    });
  };

  const selectPackage = (hours: number, optionIndex: 0 | 1 = 0) => {
    updateOptionDraft(optionIndex, (draft) => {
      const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
      const overridePrice = draft.packageOverrides[hours];
      const finalPrice =
        overridePrice !== null && overridePrice !== undefined && overridePrice > 0
          ? overridePrice
          : defaultPrice;
      return {
        ...draft,
        selectedPackage: { kind: 'standard', hours, price: finalPrice },
      };
    });
  };

  const applyCustomPackage = (optionIndex: 0 | 1 = 0) => {
    updateOptionDraft(optionIndex, (draft) => {
      const title = draft.customPackageDraft.title.trim();
      const price = parseFloat(draft.customPackageDraft.price);
      if (!title || Number.isNaN(price) || price <= 0) return draft;
      return {
        ...draft,
        selectedPackage: {
          kind: 'custom',
          title,
          description: draft.customPackageDraft.description.trim(),
          price,
        },
        addons: { ...draft.addons, unlimitedPrints: false },
      };
    });
  };

  const updatePackageOverride = (hours: number, value: string, optionIndex: 0 | 1 = 0) => {
    updateOptionDraft(optionIndex, (draft) => {
      const numValue = value === '' ? null : parseFloat(value);
      const nextOverrides = { ...draft.packageOverrides, [hours]: numValue };
      let nextPackage = draft.selectedPackage;
      if (draft.selectedPackage?.kind === 'standard' && draft.selectedPackage.hours === hours) {
        const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
        const finalPrice = numValue !== null && numValue > 0 ? numValue : defaultPrice;
        nextPackage = { kind: 'standard', hours, price: finalPrice };
      }
      return {
        ...draft,
        packageOverrides: nextOverrides,
        selectedPackage: nextPackage,
      };
    });
  };

  const savePricing = async () => {
    setSavingPricing(true);
    setPricingMessage('');
    try {
      const response = await adminFetch('/api/quotes/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editablePricing)
      });
      if (response.ok) {
        setPricing(editablePricing);
        setPricingMessage('Pricing saved successfully!');
        setTimeout(() => setPricingMessage(''), 3000);
      } else {
        setPricingMessage('Failed to save pricing');
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      setPricingMessage('Error saving pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const cancelPricingEdit = () => {
    setEditablePricing(pricing);
    setIsAdminMode(false);
  };

  const toggleAddon = (
    addonName: keyof Addons,
    value: boolean | number,
    optionIndex: 0 | 1 = 0
  ) => {
    updateOptionDraft(optionIndex, (draft) => {
      if (addonName === 'unlimitedPrints' && draft.selectedPackage?.kind === 'custom') {
        return draft;
      }
      if (addonName === 'waitingTime') {
        return {
          ...draft,
          addons: {
            ...draft.addons,
            waitingTime: value as boolean,
            waitingHours: value ? 1 : 0,
          },
        };
      }
      return {
        ...draft,
        addons: {
          ...draft.addons,
          [addonName]: value,
        },
      };
    });
  };

  const getQuoteOptions = (): ComputedQuoteOption[] => {
    const indices: Array<0 | 1> = compareTwoPackages ? [0, 1] : [0];
    return indices
      .map((index) => buildComputedOption(optionDrafts[index], pricing))
      .filter((option): option is ComputedQuoteOption => option !== null);
  };

  const canProceedToReview = compareTwoPackages
    ? Boolean(optionDrafts[0].selectedPackage && optionDrafts[1].selectedPackage)
    : Boolean(optionDrafts[0].selectedPackage);

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const options = getQuoteOptions();
      const primaryDraft = optionDrafts[0];
      const primaryOption = buildComputedOption(primaryDraft, pricing);
      const quoteData = {
        contactInfo: {
          ...contactInfo,
          eventDate: contactInfo.eventDate,
        },
        options: options.map((option) => ({
          package: option.package,
          addons: option.addons,
          discount: option.discount,
          subtotal: option.subtotal,
          total: option.total,
        })),
      };

      // Save as lead for pipeline follow-up (don't block PDF on failure)
      const nameParts = contactInfo.name.trim().split(/\s+/);
      const firstName = nameParts[0] || contactInfo.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      try {
        await adminFetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'QUOTE',
            firstName,
            lastName,
            email: contactInfo.email,
            phone: contactInfo.phone || undefined,
            eventDate: contactInfo.eventDate || undefined,
            quotePackageHours:
              primaryDraft.selectedPackage?.kind === 'standard'
                ? primaryDraft.selectedPackage.hours
                : undefined,
            quoteTotal: primaryOption?.total ?? 0,
          }),
        });
      } catch (leadErr) {
        console.warn('Could not save quote as lead:', leadErr);
      }

      const response = await adminFetch('/api/quotes/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData)
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${contactInfo.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContactInfo({
      name: '',
      email: '',
      phone: '',
      eventDate: ''
    });
    setCompareTwoPackages(false);
    setOptionDrafts([createEmptyOptionDraft(), createEmptyOptionDraft()]);
    setErrors({});
    setPhoneValue('');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPackageDetailsLines = (draft: QuoteOptionDraft) => {
    const { selectedPackage, addons, discount } = draft;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
        {selectedPackage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <span style={{ color: textColor, minWidth: 0 }}>
              {selectedPackage.kind === 'standard' ? (
                <strong>{selectedPackage.hours} Hour Photo Booth Package</strong>
              ) : (
                <>
                  <strong>{selectedPackage.title}</strong>
                  {selectedPackage.description && (
                    <div
                      style={{
                        marginTop: '8px',
                        color: mutedText,
                        fontSize: '14px',
                        fontWeight: '400',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {selectedPackage.description}
                    </div>
                  )}
                </>
              )}
            </span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
              ${selectedPackage.price.toLocaleString()}
            </span>
          </div>
        )}
        {addons.unlimitedPrints && selectedPackage && selectedPackage.kind === 'standard' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: textColor }}>
              <strong>Unlimited Prints</strong>
            </span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
              ${calculateUnlimitedPrintsPriceForDraft(draft, pricing)}
            </span>
          </div>
        )}
        {addons.glamBooth && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: textColor }}>
              <strong>Glam Booth</strong>
            </span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>${pricing.glamBooth}</span>
          </div>
        )}
        {addons.waitingTime && addons.waitingHours > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: textColor }}>
              <strong>
                Waiting Time ({addons.waitingHours} hour{addons.waitingHours > 1 ? 's' : ''})
              </strong>
            </span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
              ${calculateWaitingTimePriceForDraft(draft, pricing)}
            </span>
          </div>
        )}
        {discount.amount > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${borderColor}`,
                marginTop: '8px',
              }}
            >
              <span style={{ color: textColor }}>
                <strong>Subtotal</strong>
              </span>
              <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
                ${calculateSubtotalForDraft(draft, pricing).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#ef4444' }}>
                <strong>Discount{discount.note ? ` (${discount.note})` : ''}</strong>
              </span>
              <span style={{ color: '#ef4444', fontWeight: '600', flexShrink: 0 }}>
                -${discount.amount.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderQuoteSummary = (draft: QuoteOptionDraft) => (
    <div
      style={{
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: isDark ? '#080c08' : '#f8fafc',
        border: `1px solid ${borderColor}`,
        marginBottom: compareTwoPackages ? '0' : '24px',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Quote Summary</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: mutedText }}>Base Package:</span>
          <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
            ${draft.selectedPackage ? draft.selectedPackage.price.toLocaleString() : '0'}
          </span>
        </div>
        {draft.addons.unlimitedPrints &&
          draft.selectedPackage &&
          draft.selectedPackage.kind === 'standard' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: mutedText }}>Unlimited Prints:</span>
              <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
                ${calculateUnlimitedPrintsPriceForDraft(draft, pricing)}
              </span>
            </div>
          )}
        {draft.addons.glamBooth && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: mutedText }}>Glam Booth:</span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>${pricing.glamBooth}</span>
          </div>
        )}
        {draft.addons.waitingTime && draft.addons.waitingHours > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: mutedText }}>Waiting Time:</span>
            <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
              ${calculateWaitingTimePriceForDraft(draft, pricing)}
            </span>
          </div>
        )}
        {draft.discount.amount > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${borderColor}`,
                marginTop: '8px',
              }}
            >
              <span style={{ color: mutedText }}>Subtotal:</span>
              <span style={{ color: textColor, fontWeight: '600', flexShrink: 0 }}>
                ${calculateSubtotalForDraft(draft, pricing).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#ef4444' }}>
                Discount{draft.discount.note ? ` (${draft.discount.note})` : ''}:
              </span>
              <span style={{ color: '#ef4444', fontWeight: '600', flexShrink: 0 }}>
                -${draft.discount.amount.toLocaleString()}
              </span>
            </div>
          </>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '12px',
            borderTop: `2px solid ${borderColor}`,
            marginTop: '8px',
          }}
        >
          <span style={{ color: textColor, fontWeight: '700', fontSize: '18px' }}>Total:</span>
          <span style={{ color: accentColor, fontWeight: '700', fontSize: '20px', flexShrink: 0 }}>
            ${calculateTotalForDraft(draft, pricing).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const renderPackageSelectionSection = (optionIndex: 0 | 1) => {
    const draft = optionDrafts[optionIndex];
    const { selectedPackage, customPackageDraft, addons, discount, packageOverrides } = draft;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          ...(compareTwoPackages
            ? {
                marginBottom: optionIndex === 0 ? '32px' : '0',
                paddingBottom: optionIndex === 0 ? '32px' : '0',
                borderBottom: optionIndex === 0 ? `1px solid ${borderColor}` : 'none',
              }
            : {}),
        }}
      >
        {compareTwoPackages && (
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
            Option {optionIndex + 1}
          </h3>
        )}

        <div style={{ marginBottom: '32px', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Base Packages</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
              gap: '16px',
              width: '100%',
            }}
          >
            {[2, 3, 4, 5, 6].map((hours) => {
              const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
              const overridePrice = packageOverrides[hours];
              const hasOverride = overridePrice !== null && overridePrice !== undefined && overridePrice > 0;
              const displayPrice = hasOverride ? overridePrice : defaultPrice;

              return (
                <div key={hours} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <div
                    onClick={() => selectPackage(hours, optionIndex)}
                    style={{
                      padding: '20px',
                      borderRadius: '8px',
                      border: `2px solid ${
                        selectedPackage?.kind === 'standard' && selectedPackage.hours === hours
                          ? accentColor
                          : borderColor
                      }`,
                      backgroundColor:
                        selectedPackage?.kind === 'standard' && selectedPackage.hours === hours
                          ? isDark
                            ? '#1e3a8a'
                            : '#eff6ff'
                          : isDark
                            ? '#080c08'
                            : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '4px' }}>
                      {hours} Hours
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: accentColor }}>
                      ${displayPrice.toLocaleString()}
                    </div>
                    {hasOverride && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: mutedText,
                          textDecoration: 'line-through',
                          marginTop: '4px',
                        }}
                      >
                        ${defaultPrice.toLocaleString()} (default)
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder={`Override $${defaultPrice}`}
                    value={packageOverrides[hours] ?? ''}
                    onChange={(e) => updatePackageOverride(hours, e.target.value, optionIndex)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '14px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '32px', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Custom package</h3>
          <p style={{ margin: '0 0 16px 0', color: mutedText, fontSize: '14px' }}>
            Set your own title, optional description, and price (e.g. multi-day or custom duration). No fixed hours.
          </p>
          <div
            style={{
              padding: '20px',
              borderRadius: '8px',
              border: `2px solid ${selectedPackage?.kind === 'custom' ? accentColor : borderColor}`,
              backgroundColor:
                selectedPackage?.kind === 'custom'
                  ? isDark
                    ? '#164a2e'
                    : '#ecfdf5'
                  : isDark
                    ? '#080c08'
                    : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor,
                }}
              >
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. 2-day wedding package"
                value={customPackageDraft.title}
                onChange={(e) =>
                  updateOptionDraft(optionIndex, (current) => ({
                    ...current,
                    customPackageDraft: { ...current.customPackageDraft, title: e.target.value },
                  }))
                }
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                  color: textColor,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor,
                }}
              >
                Description (optional)
              </label>
              <textarea
                placeholder="What is included, schedule, or duration details..."
                value={customPackageDraft.description}
                onChange={(e) =>
                  updateOptionDraft(optionIndex, (current) => ({
                    ...current,
                    customPackageDraft: { ...current.customPackageDraft, description: e.target.value },
                  }))
                }
                rows={3}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                  color: textColor,
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: textColor,
                  }}
                >
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customPackageDraft.price}
                  onChange={(e) =>
                    updateOptionDraft(optionIndex, (current) => ({
                      ...current,
                      customPackageDraft: { ...current.customPackageDraft, price: e.target.value },
                    }))
                  }
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                    color: textColor,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => applyCustomPackage(optionIndex)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: accentColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Use custom package
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '32px', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Add-ons</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                cursor: selectedPackage?.kind === 'custom' ? 'not-allowed' : 'pointer',
                opacity: selectedPackage?.kind === 'custom' ? 0.65 : 1,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={addons.unlimitedPrints && selectedPackage?.kind !== 'custom'}
                    disabled={selectedPackage?.kind === 'custom'}
                    onChange={(e) => toggleAddon('unlimitedPrints', e.target.checked, optionIndex)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: selectedPackage?.kind === 'custom' ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: textColor, fontWeight: '500' }}>Unlimited Prints</span>
                </div>
                {selectedPackage?.kind === 'custom' && (
                  <span style={{ color: mutedText, fontSize: '12px', marginLeft: '32px' }}>
                    Uses package hours for pricing — choose a base package above, or skip this add-on for custom
                    packages.
                  </span>
                )}
              </div>
              <span style={{ color: accentColor, fontWeight: '600', flexShrink: 0 }}>
                $
                {selectedPackage && selectedPackage.kind === 'standard'
                  ? calculateUnlimitedPrintsPriceForDraft(draft, pricing)
                  : 0}
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={addons.glamBooth}
                  onChange={(e) => toggleAddon('glamBooth', e.target.checked, optionIndex)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ color: textColor, fontWeight: '500' }}>Glam Booth</span>
              </div>
              <span style={{ color: accentColor, fontWeight: '600', flexShrink: 0 }}>${pricing.glamBooth}</span>
            </label>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: addons.waitingTime ? '12px' : '0',
                  cursor: 'pointer',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={addons.waitingTime}
                    onChange={(e) => toggleAddon('waitingTime', e.target.checked, optionIndex)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ color: textColor, fontWeight: '500' }}>Waiting Time</span>
                </div>
                <span style={{ color: accentColor, fontWeight: '600', flexShrink: 0 }}>
                  ${calculateWaitingTimePriceForDraft(draft, pricing)}
                </span>
              </label>
              {addons.waitingTime && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ color: textColor, fontSize: '14px' }}>Hours:</label>
                  <select
                    value={addons.waitingHours}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value, 10);
                      updateOptionDraft(optionIndex, (current) => ({
                        ...current,
                        addons: { ...current.addons, waitingHours: hours },
                      }));
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                      color: textColor,
                    }}
                  >
                    {[0, 1, 2, 3, 4].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '32px', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Discount</h3>
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              backgroundColor: isDark ? '#080c08' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor,
                }}
              >
                Discount Note (appears on quote)
              </label>
              <input
                type="text"
                placeholder="e.g., Returning customer discount, Referral discount..."
                value={discount.note}
                onChange={(e) =>
                  updateOptionDraft(optionIndex, (current) => ({
                    ...current,
                    discount: { ...current.discount, note: e.target.value },
                  }))
                }
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                  color: textColor,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: textColor,
                }}
              >
                Discount Amount ($)
              </label>
              <input
                type="number"
                placeholder="Enter discount amount"
                value={discount.amount || ''}
                onChange={(e) =>
                  updateOptionDraft(optionIndex, (current) => ({
                    ...current,
                    discount: { ...current.discount, amount: parseFloat(e.target.value) || 0 },
                  }))
                }
                min="0"
                style={{
                  width: '100%',
                  maxWidth: '200px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                  color: textColor,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {renderQuoteSummary(draft)}
      </div>
    );
  };

  const primaryDraft = optionDrafts[0];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: mainBg,
      padding: '24px 16px',
      overflowX: 'hidden',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px', 
              fontWeight: '700', 
              color: textColor 
            }}>
              Generate Quote
            </h1>
            <p style={{ 
              margin: '0', 
              color: mutedText, 
              fontSize: '16px' 
            }}>
              Create a quote for a potential client
            </p>
          </div>
          <button
            onClick={() => {
              if (isAdminMode) {
                cancelPricingEdit();
              } else {
                setIsAdminMode(true);
              }
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: isAdminMode ? '#ef4444' : (isDark ? '#2d3530' : '#e2e8f0'),
              color: isAdminMode ? 'white' : textColor,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isAdminMode ? (
              <>
                <UIcon name="x" style={{ fontSize: '16px' }} /> Exit Admin Mode
              </>
            ) : (
              <>
                <UIcon name="settings" style={{ fontSize: '16px' }} /> Admin Mode
              </>
            )}
          </button>
        </div>

        {/* Admin Mode Panel */}
        {isAdminMode && (
          <div style={{
            backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            border: `2px solid ${accentColor}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: textColor }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <UIcon name="settings" style={{ fontSize: '18px' }} />
                  Edit Default Pricing
                </span>
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {pricingMessage && (
                  <span style={{ 
                    color: pricingMessage.includes('success') ? 'var(--accent)' : '#ef4444',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {pricingMessage}
                  </span>
                )}
                <button
                  onClick={savePricing}
                  disabled={savingPricing}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: savingPricing ? 'not-allowed' : 'pointer',
                    opacity: savingPricing ? 0.7 : 1
                  }}
                >
                  {savingPricing ? 'Saving...' : 'Save Pricing'}
                </button>
              </div>
            </div>

            {/* Package Prices */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: textColor }}>Package Prices</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[2, 3, 4, 5, 6].map((hours) => (
                  <div key={hours} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: mutedText }}>{hours} Hours</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: textColor }}>$</span>
                      <input
                        type="number"
                        value={editablePricing.packages[hours] || ''}
                        onChange={(e) => setEditablePricing({
                          ...editablePricing,
                          packages: { ...editablePricing.packages, [hours]: parseFloat(e.target.value) || 0 }
                        })}
                        style={{
                          width: '80px',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#080c08' : '#ffffff',
                          color: textColor,
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-on Prices */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: textColor }}>Unlimited Prints (per hour)</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: mutedText }}>Short (2-3 hrs)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: textColor }}>$</span>
                      <input
                        type="number"
                        value={editablePricing.unlimitedPrints.short || ''}
                        onChange={(e) => setEditablePricing({
                          ...editablePricing,
                          unlimitedPrints: { ...editablePricing.unlimitedPrints, short: parseFloat(e.target.value) || 0 }
                        })}
                        style={{
                          width: '70px',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#080c08' : '#ffffff',
                          color: textColor,
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: mutedText }}>Long (4+ hrs)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: textColor }}>$</span>
                      <input
                        type="number"
                        value={editablePricing.unlimitedPrints.long || ''}
                        onChange={(e) => setEditablePricing({
                          ...editablePricing,
                          unlimitedPrints: { ...editablePricing.unlimitedPrints, long: parseFloat(e.target.value) || 0 }
                        })}
                        style={{
                          width: '70px',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#080c08' : '#ffffff',
                          color: textColor,
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: mutedText }}>Glam Booth</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: textColor }}>$</span>
                  <input
                    type="number"
                    value={editablePricing.glamBooth || ''}
                    onChange={(e) => setEditablePricing({
                      ...editablePricing,
                      glamBooth: parseFloat(e.target.value) || 0
                    })}
                    style={{
                      width: '70px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: mutedText }}>Waiting Time (per hour)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: textColor }}>$</span>
                  <input
                    type="number"
                    value={editablePricing.waitingTime || ''}
                    onChange={(e) => setEditablePricing({
                      ...editablePricing,
                      waitingTime: parseFloat(e.target.value) || 0
                    })}
                    style={{
                      width: '70px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '40px',
          gap: '20px'
        }}>
          {[1, 2, 3].map((step) => (
            <div key={step} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: currentStep === step ? accentColor : 
                                 currentStep > step ? 'var(--accent)' : 
                                 isDark ? '#2d3530' : '#e2e8f0',
                color: currentStep >= step ? 'white' : mutedText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'all 0.3s'
              }}>
                {currentStep > step ? '✓' : step}
              </div>
              <span style={{
                fontSize: '12px',
                color: currentStep >= step ? textColor : mutedText,
                fontWeight: currentStep === step ? '600' : '400'
              }}>
                {step === 1 ? 'Contact Info' : step === 2 ? 'Package Selection' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Contact Information */}
        {currentStep === 1 && (
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '12px',
            padding: '32px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor }}>
              Contact Information
            </h2>
            <p style={{ margin: '0 0 24px 0', color: mutedText }}>
              Enter the client&apos;s contact information and event details.
            </p>

            <form onSubmit={handleContactSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={contactInfo.name}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.name ? '#ef4444' : borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '16px'
                    }}
                  />
                  {errors.name && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.email ? '#ef4444' : borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '16px'
                    }}
                  />
                  {errors.email && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneValue}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setPhoneValue(formatted);
                      setContactInfo({ ...contactInfo, phone: formatted });
                      if (errors.phone) setErrors({ ...errors, phone: '' });
                    }}
                    placeholder="(647) 378-5332"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.phone ? '#ef4444' : borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '16px'
                    }}
                  />
                  {errors.phone && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.phone}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor
                  }}>
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={contactInfo.eventDate}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, eventDate: e.target.value });
                      if (errors.eventDate) setErrors({ ...errors, eventDate: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.eventDate ? '#ef4444' : borderColor}`,
                      backgroundColor: isDark ? '#080c08' : '#ffffff',
                      color: textColor,
                      fontSize: '16px'
                    }}
                  />
                  {errors.eventDate && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.eventDate}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: accentColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Continue to Package Selection
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Package Selection */}
        {currentStep === 2 && (
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '12px',
            padding: '24px 16px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor }}>
              Choose Your Package
            </h2>
            <p style={{ margin: '0 0 24px 0', color: mutedText }}>
              Select your photo booth package and any add-ons.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <input
                type="checkbox"
                checked={compareTwoPackages}
                onChange={(e) => setCompareTwoPackages(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ color: textColor, fontWeight: '600' }}>Compare two packages</span>
            </label>

            {compareTwoPackages ? (
              <>
                {renderPackageSelectionSection(0)}
                {renderPackageSelectionSection(1)}
              </>
            ) : (
              renderPackageSelectionSection(0)
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: compareTwoPackages ? '8px' : '0' }}>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  setCurrentStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={!canProceedToReview}
                style={{
                  padding: '12px 24px',
                  backgroundColor: canProceedToReview ? accentColor : mutedText,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: canProceedToReview ? 'pointer' : 'not-allowed',
                  opacity: canProceedToReview ? 1 : 0.5,
                }}
              >
                Review Quote
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Quote Review */}
        {currentStep === 3 && (
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '12px',
            padding: '24px 16px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor }}>
              Review Your Quote
            </h2>
            <p style={{ margin: '0 0 24px 0', color: mutedText }}>
              Review the quote details before downloading the PDF.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px', minWidth: 0 }}>
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                border: `1px solid ${borderColor}`,
                minWidth: 0,
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                  Client Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong style={{ color: mutedText }}>Name:</strong> <span style={{ color: textColor }}>{contactInfo.name}</span></div>
                  <div><strong style={{ color: mutedText }}>Email:</strong> <span style={{ color: textColor }}>{contactInfo.email}</span></div>
                  <div><strong style={{ color: mutedText }}>Phone:</strong> <span style={{ color: textColor }}>{contactInfo.phone}</span></div>
                  <div><strong style={{ color: mutedText }}>Event Date:</strong> <span style={{ color: textColor }}>{contactInfo.eventDate}</span></div>
                </div>
              </div>

              {compareTwoPackages ? (
                ([0, 1] as const).map((optionIndex) => {
                  const draft = optionDrafts[optionIndex];
                  return (
                    <div
                      key={optionIndex}
                      style={{
                        padding: '20px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? '#080c08' : '#f8fafc',
                        border: `1px solid ${borderColor}`,
                        minWidth: 0,
                      }}
                    >
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                        Option {optionIndex + 1}
                      </h3>
                      {renderPackageDetailsLines(draft)}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          paddingTop: '16px',
                          marginTop: '16px',
                          borderTop: `2px solid ${borderColor}`,
                        }}
                      >
                        <span style={{ color: textColor, fontWeight: '700', fontSize: '18px' }}>Total:</span>
                        <span style={{ color: accentColor, fontWeight: '700', fontSize: '20px', flexShrink: 0 }}>
                          ${calculateTotalForDraft(draft, pricing).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#080c08' : '#f8fafc',
                    border: `1px solid ${borderColor}`,
                    minWidth: 0,
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                      Package Details
                    </h3>
                    {renderPackageDetailsLines(primaryDraft)}
                  </div>

                  <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: accentColor,
                    color: 'white',
                    textAlign: 'center',
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Total Cost</h3>
                    <div style={{ fontSize: '36px', fontWeight: '700' }}>
                      ${calculateTotalForDraft(primaryDraft, pricing).toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Back to Packages
              </button>
              <button
                onClick={downloadPDF}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? mutedText : accentColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Generating PDF...' : 'Download Quote PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


