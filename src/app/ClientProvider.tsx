"use client";

import { useEffect } from "react";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Sadece Farcaster Mini App içinde splash'ı kapat
    if (typeof window !== "undefined" && (window as any).farcaster?.actions?.ready) {
      (window as any).farcaster.actions.ready();
      console.log("Farcaster Mini App – SDK ready called");
    }
  }, []);

  return <>{children}</>;
}