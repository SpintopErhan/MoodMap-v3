// src/app/ClientProvider.tsx
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
    // setTimeout kaldırıldı, böylece ready() çağrısı daha erken yapılıyor
    if (typeof (sdk as any).actions?.ready === "function") {
      (sdk as any).actions.ready();
      console.log("Farcaster Mini-app SDK marked as ready."); // Ek log
    } else {
      console.warn("Farcaster Mini-app SDK actions.ready is not a function.");
    }

    // Artık timeout olmadığı için cleanup da gerekli değil.
    // return () => clearTimeout(forceReady); // Bu satır kaldırıldı
  }, []); // Bağımlılık dizisi boş kalmalı

  return <>{children}</>;
}