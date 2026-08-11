import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Quicksand } from "next/font/google";
import "./globals.css";
import MainSidebar from "@/components/MainSidebar";

// Memuat font modern
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "NBI System Monitoring",
  description: "Check your system status in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Mengaplikasikan font ke seluruh body */}
      <body
        className={`${plusJakarta.variable} ${quicksand.variable} font-[family-name:var(--font-quicksand)] antialiased bg-slate-50`}
      >
        {/* MainSidebar sekarang membungkus seluruh konten */}
        <MainSidebar>{children}</MainSidebar>
      </body>
    </html>
  );
}
