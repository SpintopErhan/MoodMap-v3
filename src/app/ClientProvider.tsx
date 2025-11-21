"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // SDK’nın yeni versiyonunda splash otomatik kapanıyor
    // Ama bazı preview’larda kapanmayabiliyor, o yüzden zorla kapatıyoruz
    const forceReady = setTimeout(() => {
      if (typeof (sdk as any).actions?.ready === "function") {
        (sdk as any).actions.ready();
      }
    }, 3000); // 3 saniye sonra zorla kapat

    return () => clearTimeout(forceReady);
  }, []);

  return <>{children}</>;
}