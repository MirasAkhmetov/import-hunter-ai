"use client";

import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

const ToastContext = React.createContext<{
  toast: (message: Omit<ToastMessage, "id">) => void;
} | null>(null);

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    const id = String(Date.now());
    setToasts((prev) => [...prev, { ...message, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((item) => (
          <Toast key={item.id} variant={item.variant} open>
            <div className="grid gap-1">
              <ToastTitle>{item.title}</ToastTitle>
              {item.description && (
                <ToastDescription>{item.description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (_message: Omit<ToastMessage, "id">) => {},
    };
  }
  return ctx;
}
