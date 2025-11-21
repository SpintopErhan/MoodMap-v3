"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Yeni SDK’da status yok, direkt ready() promise’i var
    sdk.ready().then(() => {
      sdk.actions.ready(); // Splash kapanır
    });
  }, []);

  return <>{children}</>;
}