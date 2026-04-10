"use client";

import * as React from "react";
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from "./toast";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void;
} | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProviderWrapper");
  }
  return context;
};

export const ToastProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: ToastProps) => {
    setToasts((prev) => [...prev, props]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, props.duration || 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((t, index) => (
          <Toast key={index} variant={t.variant}>
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
};

// This makes `toast()` usable directly — same behavior as `useToast().toast()`
export const toast = (_props: ToastProps) => {
  console.warn("⚠️ Direct `toast()` call requires wrapping the app in <ToastProviderWrapper>.");
};
