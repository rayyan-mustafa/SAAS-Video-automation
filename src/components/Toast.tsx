'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string, title?: string) => showToast(msg, 'success', title || 'Success'),
    [showToast]
  );

  const error = useCallback(
    (msg: string, title?: string) => showToast(msg, 'error', title || 'Error'),
    [showToast]
  );

  const info = useCallback(
    (msg: string, title?: string) => showToast(msg, 'info', title || 'Info'),
    [showToast]
  );

  const warning = useCallback(
    (msg: string, title?: string) => showToast(msg, 'warning', title || 'Warning'),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '380px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const config = {
            success: {
              border: 'rgba(16, 185, 129, 0.3)',
              dotColor: '#10b981',
            },
            error: {
              border: 'rgba(244, 63, 94, 0.3)',
              dotColor: '#f43f5e',
            },
            warning: {
              border: 'rgba(245, 158, 11, 0.3)',
              dotColor: '#f59e0b',
            },
            info: {
              border: 'rgba(255, 255, 255, 0.15)',
              dotColor: '#a1a1aa',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: '#121215',
                border: `1px solid ${config.border}`,
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#f4f4f5',
                animation: 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: config.dotColor,
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5' }}>
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
