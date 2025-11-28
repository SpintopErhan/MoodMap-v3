// src\app\ClientProvider.tsx
"use client";

import { useEffect } from "react";

// Farcaster SDK'sı için window objesine doğrudan tip tanımlamaları
// Bu tanım, getUser metodunun window.farcaster objesinin doğrudan altında olduğunu belirtir.
declare global {
  interface Window {
    farcaster?: {
      actions: {
        ready: () => void;
        sendCast?: (options: { text: string; embeds?: { url: string }[] }) => Promise<any>;
        // Diğer Farcaster aksiyonları buraya eklenebilir
      };
      getUser?: () => Promise<{ fid: number; username: string; display_name: string; pfp_url: string; } | null>; // getUser buraya taşındı!
      // Diğer Farcaster SDK özellikleri buraya eklenebilir
    };
  }
}

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const tryCallFarcasterReady = () => {
      // TypeScript artık window.farcaster'ı bu dosyanın kendi tanımından tanıyacak.
      // actions.ready() çağrısı doğru yolda.
      if (typeof window !== "undefined" && window.farcaster?.actions?.ready) {
        window.farcaster.actions.ready();
        console.log("Farcaster Mini App – SDK ready called.");
        return true;
      }
      return false;
    };

    if (tryCallFarcasterReady()) {
      return;
    }

    const intervalId = setInterval(() => {
      if (tryCallFarcasterReady()) {
        clearInterval(intervalId);
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, []);

  return <>{children}</>;
}