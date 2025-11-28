"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import ClientProvider from "./ClientProvider";
import { base, ethereum } from "@privy-io/react-auth/chains"; // ← BU SATIRI EKLE

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

        // SENDCAST İÇİN ZORUNLU
        embeddedWallets: {
          createOnLogin: "all-users",
          noPromptOnSignature: true,
        },

        // supportedChains → doğru tipte (Chain[])
        supportedChains: [ethereum, base], // ← BU ŞEKİLDE YAZ
      }}
    >
      <ClientProvider>{children}</ClientProvider>
    </PrivyProvider>
  );
}