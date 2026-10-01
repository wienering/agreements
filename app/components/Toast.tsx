'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}


export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      zIndex: 9999,
      padding: '12px 20px',
      borderRadius: '2px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: 'none',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out',
      maxWidth: '300px',
      wordWrap: 'break-word' as const,
    };

    switch (type) {
      case 'success':
        return { ...baseStyles, backgroundColor: 'var(--accent)', color: 'var(--accent-on)' };
      case 'error':
        return { ...baseStyles, backgroundColor: 'var(--alert)', color: 'var(--accent-on)' };
      case 'info':
        return { ...baseStyles, backgroundColor: 'var(--admin-surface-raised)', color: 'var(--admin-text)', border: '1px solid var(--admin-hairline)' };
      default:
        return { ...baseStyles, backgroundColor: 'var(--accent)', color: 'var(--accent-on)' };
    }
  };

  return (
    <div style={getToastStyles()}>
      {message}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}
