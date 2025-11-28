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

        // SENDCAST İÇİN ZORUNLU – embedded wallet aktif
        embeddedWallets: {
          createOnLogin: "all-users",
          noPromptOnSignature: true,
        },

        // supportedChains yerine bu şekilde (eski versiyonlarda çalışır)
        // Privy 1.76.1’de chains export’u yok, bu yüzden manuel tanımlıyoruz
        supportedChains: [
          {
            id: 1,
            name: "Ethereum",
            network: "ethereum",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: ["https://eth-mainnet.alchemyapi.io/v2/demo"] } },
          },
          {
            id: 8453,
            name: "Base",
            network: "base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
          },
        ],
      }}
    >
      <ClientProvider>{children}</ClientProvider>
    </PrivyProvider>
  );
}