'use client';

import { useState } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
}

interface Package {
  hours: number;
  price: number;
}

interface Addons {
  unlimitedPrints: boolean;
  glamBooth: boolean;
  waitingTime: boolean;
  waitingHours: number;
}

const PRICING = {
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
  const { isDark } = useDarkMode();
  const [currentStep, setCurrentStep] = useState(1);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    eventDate: ''
  });
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [addons, setAddons] = useState<Addons>({
    unlimitedPrints: false,
    glamBooth: false,
    waitingTime: false,
    waitingHours: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#3b82f6';

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

    if (!contactInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!contactInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(contactInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!contactInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!contactInfo.eventDate) {
      newErrors.eventDate = 'Event date is required';
    } else if (new Date(contactInfo.eventDate) < new Date()) {
      newErrors.eventDate = 'Event date must be in the future';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setContactInfo({
        ...contactInfo,
        eventDate: formatEventDate(contactInfo.eventDate)
      });
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectPackage = (hours: number, price: number) => {
    setSelectedPackage({ hours, price });
  };

  const toggleAddon = (addonName: keyof Addons, value: boolean | number) => {
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
    if (!selectedPackage || !addons.unlimitedPrints) return 0;
    const isShortPackage = selectedPackage.hours <= 3;
    const ratePerHour = isShortPackage ? PRICING.unlimitedPrints.short : PRICING.unlimitedPrints.long;
    return ratePerHour * selectedPackage.hours;
  };

  const calculateWaitingTimePrice = () => {
    if (!addons.waitingTime || addons.waitingHours === 0) return 0;
    return PRICING.waitingTime * addons.waitingHours;
  };

  const calculateTotal = () => {
    if (!selectedPackage) return 0;
    let total = selectedPackage.price;
    total += calculateUnlimitedPrintsPrice();
    if (addons.glamBooth) total += PRICING.glamBooth;
    total += calculateWaitingTimePrice();
    return total;
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
        total: calculateTotal()
      };

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
    setAddons({
      unlimitedPrints: false,
      glamBooth: false,
      waitingTime: false,
      waitingHours: 0
    });
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
        <div style={{ marginBottom: '32px' }}>
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
                                 currentStep > step ? '#10b981' : 
                                 isDark ? '#334155' : '#e2e8f0',
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
              Enter the client's contact information and event details.
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
                    Full Name *
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
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                    Email Address *
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
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                    Phone Number *
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
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                    Event Date *
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
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
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
                {[2, 3, 4, 5, 6].map((hours) => (
                  <div
                    key={hours}
                    onClick={() => selectPackage(hours, PRICING.packages[hours as keyof typeof PRICING.packages])}
                    style={{
                      padding: '20px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedPackage?.hours === hours ? accentColor : borderColor}`,
                      backgroundColor: selectedPackage?.hours === hours 
                        ? (isDark ? '#1e3a8a' : '#eff6ff') 
                        : (isDark ? '#0f172a' : '#ffffff'),
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '4px' }}>
                      {hours} Hours
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: accentColor }}>
                      ${PRICING.packages[hours as keyof typeof PRICING.packages].toLocaleString()}
                    </div>
                  </div>
                ))}
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
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={addons.unlimitedPrints}
                      onChange={(e) => toggleAddon('unlimitedPrints', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ color: textColor, fontWeight: '500' }}>Unlimited Prints</span>
                  </div>
                  <span style={{ color: accentColor, fontWeight: '600' }}>
                    ${selectedPackage ? calculateUnlimitedPrintsPrice() : 0}
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
                  <span style={{ color: accentColor, fontWeight: '600' }}>$75</span>
                </label>

                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc'
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
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
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

            {/* Quote Summary */}
            <div style={{
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
                {addons.unlimitedPrints && selectedPackage && (
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
                    <span style={{ color: textColor, fontWeight: '600' }}>$75</span>
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
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: `1px solid ${borderColor}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>
                  Package Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedPackage && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textColor }}>
                        <strong>{selectedPackage.hours} Hour Photo Booth Package</strong>
                      </span>
                      <span style={{ color: textColor, fontWeight: '600' }}>
                        ${selectedPackage.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {addons.unlimitedPrints && selectedPackage && (
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
                      <span style={{ color: textColor, fontWeight: '600' }}>$75</span>
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


