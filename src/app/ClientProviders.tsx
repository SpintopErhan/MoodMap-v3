// src\app\ClientProviders.tsx
"use client";

import ClientProvider from "./ClientProvider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientProvider>
      {children}
    </ClientProvider>
  );
}