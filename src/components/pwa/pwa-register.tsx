"use client";

import * as React from "react";

export function PwaRegister() {
  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch(() => {
          // Gracefully continue in environments where service worker registration is restricted
        });
    }
  }, []);

  return null;
}

