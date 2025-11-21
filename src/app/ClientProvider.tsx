"use client";

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // SDK’nın yeni versiyonunda splash otomatik kapanıyor, hiçbir şey yapmamıza gerek yok!
  return <>{children}</>;
}