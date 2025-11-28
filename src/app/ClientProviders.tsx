"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import ClientProvider from "./ClientProvider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["farcaster"],
        appearance: { theme: "dark" },
        // Embedded wallet'ı aktif et – cast atma için zorunlu
        embeddedWallets: {
          createOnLogin: "all-users", // Her login'de wallet yaratır
        },
      }}
    >
      <ClientProvider>{children}</ClientProvider>
    </PrivyProvider>
  );
}