"use client";

import { useEffect } from "react"; // ← BU SATIRI EKLE!

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Sadece Farcaster Mini App içinde splash'ı kapat
    if (typeof window !== "undefined" && (window as any).farcaster) {
      if (typeof (window as any).farcaster.actions?.ready === "function") {
        (window as any).farcaster.actions.ready();
        console.log("Farcaster Mini App – SDK ready called");
      }
    }
  }, []);

  return <>{children}</>;
}