import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders"; // <-- yeni dosya

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MoodMap",
  description: "Share your mood on the global map",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0f0f23] text-white`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}