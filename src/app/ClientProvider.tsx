"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (sdk.status === "ready") {
      sdk.actions.ready(); // Splash kapanır, ready hatası yok
    }
  }, []);

  return <>{children}</>;
}