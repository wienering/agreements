'use client';

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
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [customPackageDraft, setCustomPackageDraft] = useState({
    title: '',
    description: '',
    price: ''
  });
  const [addons, setAddons] = useState<Addons>({
    unlimitedPrints: false,
    glamBooth: false,
    waitingTime: false,
    waitingHours: 0
  });
  const [discount, setDiscount] = useState<Discount>({
    note: '',
    amount: 0
  });
  const [packageOverrides, setPackageOverrides] = useState<PackageOverrides>({});
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
        const response = await fetch('/api/quotes/pricing');
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

  const selectPackage = (hours: number) => {
    const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
    const overridePrice = packageOverrides[hours];
    const finalPrice = overridePrice !== null && overridePrice !== undefined && overridePrice > 0 
      ? overridePrice 
      : defaultPrice;
    setSelectedPackage({ kind: 'standard', hours, price: finalPrice });
  };

  const applyCustomPackage = () => {
    const title = customPackageDraft.title.trim();
    const price = parseFloat(customPackageDraft.price);
    if (!title) return;
    if (Number.isNaN(price) || price <= 0) return;
    setSelectedPackage({
      kind: 'custom',
      title,
      description: customPackageDraft.description.trim(),
      price
    });
    setAddons((prev) => ({ ...prev, unlimitedPrints: false }));
  };

  const updatePackageOverride = (hours: number, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setPackageOverrides({ ...packageOverrides, [hours]: numValue });
    // If this package is currently selected, update its price
    if (selectedPackage?.kind === 'standard' && selectedPackage.hours === hours) {
      const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
      const finalPrice = numValue !== null && numValue > 0 ? numValue : defaultPrice;
      setSelectedPackage({ kind: 'standard', hours, price: finalPrice });
    }
  };

  const savePricing = async () => {
    setSavingPricing(true);
    setPricingMessage('');
    try {
      const response = await fetch('/api/quotes/pricing', {
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

  const toggleAddon = (addonName: keyof Addons, value: boolean | number) => {
    if (addonName === 'unlimitedPrints' && selectedPackage?.kind === 'custom') {
      return;
    }
    if (addonName === 'waitingTime') {
      setAddons({
        ...addons,
        waitingTime: value as boolean,
        waitingHours: value ? 1 : 0
      });
    } else {
      setAddons({
        ...addons,
        [addonName]: value
      });
    }
  };

  const calculateUnlimitedPrintsPrice = () => {
    if (!selectedPackage || selectedPackage.kind !== 'standard' || !addons.unlimitedPrints) return 0;
    const isShortPackage = selectedPackage.hours <= 3;
    const ratePerHour = isShortPackage ? pricing.unlimitedPrints.short : pricing.unlimitedPrints.long;
    return ratePerHour * selectedPackage.hours;
  };

  const calculateWaitingTimePrice = () => {
    if (!addons.waitingTime || addons.waitingHours === 0) return 0;
    return pricing.waitingTime * addons.waitingHours;
  };

  const calculateSubtotal = () => {
    if (!selectedPackage) return 0;
    let subtotal = selectedPackage.price;
    subtotal += calculateUnlimitedPrintsPrice();
    if (addons.glamBooth) subtotal += pricing.glamBooth;
    subtotal += calculateWaitingTimePrice();
    return subtotal;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = discount.amount > 0 ? discount.amount : 0;
    return Math.max(0, subtotal - discountAmount);
  };

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const quoteData = {
        contactInfo: {
          ...contactInfo,
          eventDate: contactInfo.eventDate
        },
        package: selectedPackage,
        addons: addons,
        discount: discount.amount > 0 ? discount : null,
        subtotal: calculateSubtotal(),
        total: calculateTotal()
      };

      // Save as lead for pipeline follow-up (don't block PDF on failure)
      const nameParts = contactInfo.name.trim().split(/\s+/);
      const firstName = nameParts[0] || contactInfo.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'QUOTE',
            firstName,
            lastName,
            email: contactInfo.email,
            phone: contactInfo.phone || undefined,
            eventDate: contactInfo.eventDate || undefined,
            quotePackageHours: selectedPackage?.kind === 'standard' ? selectedPackage.hours : undefined,
            quoteTotal: calculateTotal(),
          }),
        });
      } catch (leadErr) {
        console.warn('Could not save quote as lead:', leadErr);
      }

      const response = await fetch('/api/quotes/generate-pdf', {
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
    setSelectedPackage(null);
    setCustomPackageDraft({ title: '', description: '', price: '' });
    setAddons({
      unlimitedPrints: false,
      glamBooth: false,
      waitingTime: false,
      waitingHours: 0
    });
    setDiscount({
      note: '',
      amount: 0
    });
    setPackageOverrides({});
    setErrors({});
    setPhoneValue('');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            padding: '32px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor }}>
              Choose Your Package
            </h2>
            <p style={{ margin: '0 0 24px 0', color: mutedText }}>
              Select your photo booth package and any add-ons.
            </p>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Base Packages
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {[2, 3, 4, 5, 6].map((hours) => {
                  const defaultPrice = pricing.packages[hours] || DEFAULT_PRICING.packages[hours];
                  const overridePrice = packageOverrides[hours];
                  const hasOverride = overridePrice !== null && overridePrice !== undefined && overridePrice > 0;
                  const displayPrice = hasOverride ? overridePrice : defaultPrice;
                  
                  return (
                    <div key={hours} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        onClick={() => selectPackage(hours)}
                        style={{
                          padding: '20px',
                          borderRadius: '8px',
                          border: `2px solid ${selectedPackage?.kind === 'standard' && selectedPackage.hours === hours ? accentColor : borderColor}`,
                          backgroundColor: selectedPackage?.kind === 'standard' && selectedPackage.hours === hours
                            ? (isDark ? '#1e3a8a' : '#eff6ff') 
                            : (isDark ? '#080c08' : '#ffffff'),
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '4px' }}>
                          {hours} Hours
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: accentColor }}>
                          ${displayPrice.toLocaleString()}
                        </div>
                        {hasOverride && (
                          <div style={{ fontSize: '12px', color: mutedText, textDecoration: 'line-through', marginTop: '4px' }}>
                            ${defaultPrice.toLocaleString()} (default)
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder={`Override $${defaultPrice}`}
                        value={packageOverrides[hours] ?? ''}
                        onChange={(e) => updatePackageOverride(hours, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#080c08' : '#ffffff',
                          color: textColor,
                          fontSize: '14px',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Custom package
              </h3>
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
                  gap: '12px'
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: textColor
                    }}
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2-day wedding package"
                    value={customPackageDraft.title}
                    onChange={(e) => setCustomPackageDraft({ ...customPackageDraft, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                      color: textColor,
                      fontSize: '14px'
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
                      color: textColor
                    }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="What is included, schedule, or duration details..."
                    value={customPackageDraft.description}
                    onChange={(e) => setCustomPackageDraft({ ...customPackageDraft, description: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                      color: textColor,
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1', minWidth: '140px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: textColor
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
                      onChange={(e) => setCustomPackageDraft({ ...customPackageDraft, price: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${borderColor}`,
                        backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                        color: textColor,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCustomPackage}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: accentColor,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Use custom package
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Add-ons
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#080c08' : '#f8fafc',
                  cursor: selectedPackage?.kind === 'custom' ? 'not-allowed' : 'pointer',
                  opacity: selectedPackage?.kind === 'custom' ? 0.65 : 1
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={addons.unlimitedPrints && selectedPackage?.kind !== 'custom'}
                        disabled={selectedPackage?.kind === 'custom'}
                        onChange={(e) => toggleAddon('unlimitedPrints', e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: selectedPackage?.kind === 'custom' ? 'not-allowed' : 'pointer' }}
                      />
                      <span style={{ color: textColor, fontWeight: '500' }}>Unlimited Prints</span>
                    </div>
                    {selectedPackage?.kind === 'custom' && (
                      <span style={{ color: mutedText, fontSize: '12px', marginLeft: '32px' }}>
                        Uses package hours for pricing — choose a base package above, or skip this add-on for custom packages.
                      </span>
                    )}
                  </div>
                  <span style={{ color: accentColor, fontWeight: '600' }}>
                    ${selectedPackage && selectedPackage.kind === 'standard' ? calculateUnlimitedPrintsPrice() : 0}
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#080c08' : '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={addons.glamBooth}
                      onChange={(e) => toggleAddon('glamBooth', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ color: textColor, fontWeight: '500' }}>Glam Booth</span>
                  </div>
                  <span style={{ color: accentColor, fontWeight: '600' }}>${pricing.glamBooth}</span>
                </label>

                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#080c08' : '#f8fafc'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: addons.waitingTime ? '12px' : '0',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={addons.waitingTime}
                        onChange={(e) => toggleAddon('waitingTime', e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ color: textColor, fontWeight: '500' }}>Waiting Time</span>
                    </div>
                    <span style={{ color: accentColor, fontWeight: '600' }}>
                      ${calculateWaitingTimePrice()}
                    </span>
                  </label>
                  {addons.waitingTime && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ color: textColor, fontSize: '14px' }}>Hours:</label>
                      <select
                        value={addons.waitingHours}
                        onChange={(e) => {
                          const hours = parseInt(e.target.value);
                          setAddons({ ...addons, waitingHours: hours });
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                          color: textColor
                        }}
                      >
                        {[0, 1, 2, 3, 4].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Discount Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Discount
              </h3>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: textColor
                  }}>
                    Discount Note (appears on quote)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Returning customer discount, Referral discount..."
                    value={discount.note}
                    onChange={(e) => setDiscount({ ...discount, note: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: textColor
                  }}>
                    Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter discount amount"
                    value={discount.amount || ''}
                    onChange={(e) => setDiscount({ ...discount, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    style={{
                      width: '200px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: isDark ? '#1a1d1a' : '#ffffff',
                      color: textColor,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quote Summary */}
            <div style={{
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#080c08' : '#f8fafc',
              border: `1px solid ${borderColor}`,
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                Quote Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: mutedText }}>Base Package:</span>
                  <span style={{ color: textColor, fontWeight: '600' }}>
                    ${selectedPackage ? selectedPackage.price.toLocaleString() : '0'}
                  </span>
                </div>
                {addons.unlimitedPrints && selectedPackage && selectedPackage.kind === 'standard' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Unlimited Prints:</span>
                    <span style={{ color: textColor, fontWeight: '600' }}>
                      ${calculateUnlimitedPrintsPrice()}
                    </span>
                  </div>
                )}
                {addons.glamBooth && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Glam Booth:</span>
                    <span style={{ color: textColor, fontWeight: '600' }}>${pricing.glamBooth}</span>
                  </div>
                )}
                {addons.waitingTime && addons.waitingHours > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Waiting Time:</span>
                    <span style={{ color: textColor, fontWeight: '600' }}>
                      ${calculateWaitingTimePrice()}
                    </span>
                  </div>
                )}
                {discount.amount > 0 && (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: `1px solid ${borderColor}`,
                      marginTop: '8px'
                    }}>
                      <span style={{ color: mutedText }}>Subtotal:</span>
                      <span style={{ color: textColor, fontWeight: '600' }}>
                        ${calculateSubtotal().toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#ef4444' }}>
                        Discount{discount.note ? ` (${discount.note})` : ''}:
                      </span>
                      <span style={{ color: '#ef4444', fontWeight: '600' }}>
                        -${discount.amount.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: `2px solid ${borderColor}`,
                  marginTop: '8px'
                }}>
                  <span style={{ color: textColor, fontWeight: '700', fontSize: '18px' }}>Total:</span>
                  <span style={{ color: accentColor, fontWeight: '700', fontSize: '20px' }}>
                    ${calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedPackage}
                style={{
                  padding: '12px 24px',
                  backgroundColor: selectedPackage ? accentColor : mutedText,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: selectedPackage ? 'pointer' : 'not-allowed',
                  opacity: selectedPackage ? 1 : 0.5
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
            padding: '32px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: textColor }}>
              Review Your Quote
            </h2>
            <p style={{ margin: '0 0 24px 0', color: mutedText }}>
              Review the quote details before downloading the PDF.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                border: `1px solid ${borderColor}`
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

              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#080c08' : '#f8fafc',
                border: `1px solid ${borderColor}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                  Package Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedPackage && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <span style={{ color: textColor }}>
                        {selectedPackage.kind === 'standard' ? (
                          <strong>{selectedPackage.hours} Hour Photo Booth Package</strong>
                        ) : (
                          <>
                            <strong>{selectedPackage.title}</strong>
                            {selectedPackage.description && (
                              <div style={{ marginTop: '8px', color: mutedText, fontSize: '14px', fontWeight: '400', whiteSpace: 'pre-wrap' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textColor }}><strong>Unlimited Prints</strong></span>
                      <span style={{ color: textColor, fontWeight: '600' }}>
                        ${calculateUnlimitedPrintsPrice()}
                      </span>
                    </div>
                  )}
                  {addons.glamBooth && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textColor }}><strong>Glam Booth</strong></span>
                      <span style={{ color: textColor, fontWeight: '600' }}>${pricing.glamBooth}</span>
                    </div>
                  )}
                  {addons.waitingTime && addons.waitingHours > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textColor }}>
                        <strong>Waiting Time ({addons.waitingHours} hour{addons.waitingHours > 1 ? 's' : ''})</strong>
                      </span>
                      <span style={{ color: textColor, fontWeight: '600' }}>
                        ${calculateWaitingTimePrice()}
                      </span>
                    </div>
                  )}
                  {discount.amount > 0 && (
                    <>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '12px',
                        borderTop: `1px solid ${borderColor}`,
                        marginTop: '8px'
                      }}>
                        <span style={{ color: textColor }}><strong>Subtotal</strong></span>
                        <span style={{ color: textColor, fontWeight: '600' }}>
                          ${calculateSubtotal().toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#ef4444' }}>
                          <strong>Discount{discount.note ? ` (${discount.note})` : ''}</strong>
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                          -${discount.amount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: accentColor,
                color: 'white',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Total Cost</h3>
                <div style={{ fontSize: '36px', fontWeight: '700' }}>
                  ${calculateTotal().toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
                  cursor: 'pointer'
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
                  opacity: loading ? 0.7 : 1
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


