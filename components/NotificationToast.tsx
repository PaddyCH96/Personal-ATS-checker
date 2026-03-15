"use client";

import { useState, createContext, useContext, ReactNode, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface NotificationContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const typeStyles: Record<string, string> = {
    success: 'bg-green-600',
    info: 'bg-blue-600',
    error: 'bg-red-600',
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`${typeStyles[t.type]} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up flex items-center gap-2 max-w-sm`}>
            {t.type === 'success' && '✓'}
            {t.type === 'info' && 'ℹ'}
            {t.type === 'error' && '✕'}
            {t.message}
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
