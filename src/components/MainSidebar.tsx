"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  MessageCircle,
  HardDrive,
  LogOut,
  Server,
  Menu,
  X,
} from "lucide-react";

export default function MainSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fungsi Logout
  const handleLogout = async () => {
    if (confirm("Yakin ingin keluar dari sistem?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Jika di halaman login, JANGAN tampilkan Sidebar sama sekali
  if (pathname === "/login") {
    return <main className="w-full min-h-screen bg-slate-50">{children}</main>;
  }

  // TAMPILAN NORMAL (DASHBOARD)
  return (
    <div className="flex w-full min-h-screen bg-slate-50/50 relative">
      {/* ============ HEADER MOBILE (Hanya tampil di HP) ============ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white text-slate-900 z-40 flex items-center justify-between px-4 border-b border-slate-200 shadow-sm">
        <h1 className="font-bold text-base tracking-tight font-[family-name:var(--font-plus-jakarta-sans)]">
          TOR MONITOR KETUA
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* OVERLAY GELAP UNTUK MOBILE */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* ============ NAVIGASI SIDEBAR ============ */}
      <aside
        className={`w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* BRANDING HEADER */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-200">
          <h1 className="text-slate-900 font-bold text-sm tracking-tight truncate font-[family-name:var(--font-plus-jakarta-sans)]">
            TOR MONITOR KETUA
          </h1>
          {/* Tombol Tutup Sidebar Khusus Mobile */}
          <button
            className="lg:hidden p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            onClick={closeMobileMenu}
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
          {[
            { href: "/", icon: LayoutDashboard, label: "Dashboard" },
            {
              href: "/network-monitor",
              icon: Network,
              label: "Network Monitor",
            },
            { href: "/esxi-monitor", icon: Server, label: "ESXi Monitor" },
            {
              href: "/storage-monitor",
              icon: HardDrive,
              label: "Storage Monitor",
            },
            {
              href: "/whatsapp",
              icon: MessageCircle,
              label: "WhatsApp Gateway",
            },
          ].map((menu) => {
            const isActive = pathname === menu.href;

            return (
              <Link
                key={menu.href}
                href={menu.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? "bg-slate-900 text-slate-50 shadow-sm" // High-contrast shadcn active state
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900" // Subtle hover state
                }`}
              >
                <menu.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{menu.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ============ TOMBOL LOGOUT ============ */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* ============ AREA KONTEN UTAMA ============ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-14 lg:pt-0 lg:ml-64 relative">
        {children}
      </main>
    </div>
  );
}
