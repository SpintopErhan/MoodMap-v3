"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import ClientProvider from "./ClientProvider"; // sdk.actions.ready için

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
      }}
    >
      <ClientProvider>{children}</ClientProvider>
    </PrivyProvider>
  );
}