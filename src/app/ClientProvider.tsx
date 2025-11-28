// src\app\ClientProvider.tsx
    "use client";

    import { useEffect } from "react";

    // GEÇİCİ ÇÖZÜM: TypeScript'in window.farcaster'ı tanıması için tipi buraya ekliyoruz.
    // Normalde bu bir .d.ts dosyasında olmalıydı, ancak sorun devam ettiği için bu şekilde yapıyoruz.
    declare global {
      interface Window {
        farcaster?: {
          actions: {
            ready: () => void;
            // Buraya diğer Farcaster aksiyonları eklenebilir, örneğin window.farcaster.actions.sendCast vb.
            // Ama şimdilik sadece ready() yeterli.
          };
        };
      }
    }
    // GEÇİCİ ÇÖZÜM SONU

    export default function ClientProvider({
      children,
    }: {
      children: React.ReactNode;
    }) {
      useEffect(() => {
        const tryCallFarcasterReady = () => {
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