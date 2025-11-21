"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // SDK ready olduğunda splash'ı kapat (Vercel preview’da bile çalışır)
    const timer = setInterval(() => {
      if (sdk.status === "ready") {
        sdk.actions.ready();
        clearInterval(timer);
      }
    }, 100);

    // 10 saniye sonra zorla kapat (güvenlik)
    const force = setTimeout(() => {
      sdk.actions.ready();
      clearInterval(timer);
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(force);
    };
  }, []);

  return <>{children}</>;
}