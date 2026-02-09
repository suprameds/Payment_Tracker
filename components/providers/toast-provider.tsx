'use client';

import { createContext, useContext } from 'react';
import { Toaster, toast as hotToast, Toast } from 'react-hot-toast';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const createToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: ToastOptions) => {
    const toastFn = type === 'success' ? hotToast.success :
                    type === 'error' ? hotToast.error :
                    type === 'warning' ? hotToast :
                    hotToast;

    return toastFn(message, {
      duration: options?.duration || (type === 'error' ? 5000 : 4000),
      position: 'top-right',
      style: {
        borderRadius: '12px',
        background: '#fff',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        padding: '16px',
      },
      icon: type === 'success' ? '✅' :
            type === 'error' ? '❌' :
            type === 'warning' ? '⚠️' :
            'ℹ️',
      ...(options?.action && {
        // Add action button using custom toast
        action: {
          label: options.action.label,
          onClick: options.action.onClick,
        },
      }),
    });
  };

  const value: ToastContextValue = {
    success: (message, options) => createToast('success', message, options),
    error: (message, options) => createToast('error', message, options),
    info: (message, options) => createToast('info', message, options),
    warning: (message, options) => createToast('warning', message, options),
    loading: (message) => hotToast.loading(message, {
      position: 'top-right',
      style: {
        borderRadius: '12px',
        background: '#fff',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        padding: '16px',
      },
    }),
    dismiss: (toastId) => hotToast.dismiss(toastId),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            borderRadius: '12px',
            background: '#fff',
            color: '#1f2937',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
