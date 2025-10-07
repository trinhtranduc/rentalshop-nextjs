'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const Icon = toastIcons[type];

  return (
    <div
      className={cn(
        'w-full transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
    >
      <div
        className={cn(
          'border rounded-lg shadow-lg p-4 flex items-start space-x-3',
          toastStyles[type]
        )}
      >
        <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconStyles[type])} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{title}</h4>
          {message && (
            <p className="text-sm mt-1 opacity-90">{message}</p>
          )}
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="ml-2 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  console.log('🎯 ToastContainer render:', { toastsCount: toasts?.length || 0, toasts });
  
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm">
      {toasts?.map((toast, index) => (
        <div 
          key={toast.id} 
          className="animate-slide-in-from-right"
          style={{ 
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 8}px)`
          }}
        >
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// Toast Context Type
type ToastContextType = {
  toasts: ToastProps[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      id,
      type,
      title,
      message,
      duration,
      onClose: removeToast,
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook for managing toasts (internal)
export const useToasts = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};

// Unified toast hook with consistent naming (public API)
export const useToast = () => {
  const { addToast, removeToast } = useToasts();
  
  // ✅ NEW: Prefixed naming to avoid conflicts with state variables
  const toastSuccess = (title: string, message?: string) => addToast('success', title, message);
  const toastError = (title: string, message?: string) => addToast('error', title, message, 0); // No auto-hide for errors
  const toastWarning = (title: string, message?: string) => addToast('warning', title, message);
  const toastInfo = (title: string, message?: string) => addToast('info', title, message);
  
  return {
    // Primary API - use these to avoid naming conflicts
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    removeToast,
    // Deprecated: kept for backward compatibility, will be removed in future
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
    info: toastInfo,
  };
};
