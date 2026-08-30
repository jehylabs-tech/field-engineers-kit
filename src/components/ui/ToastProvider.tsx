"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-spec-text px-4 py-2.5 text-base font-medium text-spec-bg shadow-lg">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
