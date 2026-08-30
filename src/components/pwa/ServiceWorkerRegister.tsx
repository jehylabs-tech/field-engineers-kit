"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      // Register service worker after window load to avoid blocking critical render
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV !== "production") {
              console.log("[PWA] Service Worker registered:", registration.scope);
            }
          })
          .catch((error) => {
            console.warn("[PWA] Service Worker registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
