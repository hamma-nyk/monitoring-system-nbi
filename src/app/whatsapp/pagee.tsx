"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  LogOut,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ServerCrash,
} from "lucide-react";

// Sesuaikan URL ini jika backend Anda berjalan di IP/Port yang berbeda
const API_BASE_URL = "http://localhost:3333/api";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>("loading"); // loading, disconnected, qr_ready, connected, error
  const [user, setUser] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // State untuk form uji coba pesan
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fungsi untuk mengecek status bot di backend
  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/status`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      setStatus(data.status);
      setUser(data.user);

      // Ambil QR Code jika statusnya siap dan kita belum menyimpannya
      if (data.status === "qr_ready" && !qrCode) {
        fetchQrCode();
      }

      // Bersihkan QR Code jika sudah terhubung atau terputus
      if (data.status === "connected" || data.status === "disconnected") {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Backend WA offline:", error);
      setStatus("error");
    }
  };

  // Fungsi untuk mengambil gambar QR Code (Base64)
  const fetchQrCode = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/qr`);
      const data = await res.json();
      if (data.success && data.qr) {
        setQrCode(data.qr);
      }
    } catch (error) {
      console.error("Gagal mengambil QR:", error);
    }
  };

  // Mekanisme Polling: Cek status setiap 3 detik secara otomatis
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCode]);

  // Fungsi untuk memutuskan koneksi (Logout)
  const handleLogout = async () => {
    if (
      !confirm(
        "Yakin ingin logout dari WhatsApp? Anda harus scan QR ulang nanti.",
      )
    )
      return;
    try {
      setStatus("loading");
      await fetch(`${API_BASE_URL}/logout`, { method: "POST" });
      setQrCode(null);
      setUser(null);
    } catch (error) {
      alert("Gagal melakukan logout");
    }
  };

  // Fungsi untuk mengirim pesan percobaan
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: testNumber,
          type: "text",
          text: testMessage,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert("Pesan berhasil terkirim!");
        setTestMessage("");
      } else {
        alert("Gagal mengirim pesan: " + data.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan komunikasi dengan server.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      {/* Header Halaman */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Smartphone className="text-emerald-500" size={32} />
          Koneksi WhatsApp Bot
        </h1>
        <p className="text-slate-600 mt-2">
          Kelola sesi WhatsApp untuk pengiriman notifikasi otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ================= PANEL KIRI ================= */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Indikator Status */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Status Koneksi
            </h2>

            {status === "loading" && (
              <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <RefreshCw className="animate-spin" size={24} />
                <span className="font-medium">
                  Memeriksa layanan backend...
                </span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                <ServerCrash size={24} />
                <div>
                  <div className="font-bold">Backend Offline</div>
                  <div className="text-sm">
                    Pastikan script Node.js (port 3333) sedang berjalan.
                  </div>
                </div>
              </div>
            )}

            {status === "disconnected" && (
              <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <XCircle className="text-slate-400" size={24} />
                <div>
                  <div className="font-bold">Terputus</div>
                  <div className="text-sm">
                    Menunggu backend menyiapkan sesi baru...
                  </div>
                </div>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <QrCode size={24} />
                <div>
                  <div className="font-bold">Menunggu Scan QR</div>
                  <div className="text-sm">
                    Silakan scan QR Code di bawah menggunakan WhatsApp Anda.
                  </div>
                </div>
              </div>
            )}

            {status === "connected" && (
              <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <CheckCircle2 className="text-emerald-500" size={24} />
                <div>
                  <div className="font-bold">Terhubung Aktif</div>
                  <div className="text-sm">Nomor Bot: +{user}</div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2A: Tampilan QR Code (Hanya muncul jika qr_ready) */}
          {status === "qr_ready" && qrCode && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                Scan QR Code
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Buka WhatsApp &gt; Perangkat Tautkan &gt; Scan QR ini
              </p>
              <div className="p-4 bg-white border-4 border-slate-100 rounded-2xl shadow-sm inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>
          )}

          {/* Card 2B: Tombol Logout (Hanya muncul jika connected) */}
          {status === "connected" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                Manajemen Sesi
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Gunakan tombol di bawah jika Anda ingin mengganti nomor bot.
              </p>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold py-3 px-4 rounded-xl transition-colors"
              >
                <LogOut size={20} /> Putuskan Koneksi (Logout)
              </button>
            </div>
          )}
        </div>

        {/* ================= PANEL KANAN ================= */}
        <div
          className={`transition-opacity duration-300 ${status !== "connected" ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              Uji Coba Pengiriman
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Kirim pesan percobaan untuk memastikan bot berfungsi normal.
            </p>

            <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nomor Tujuan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 08123456789 atau 628..."
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Isi Pesan
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Ketik pesan percobaan di sini..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSending || status !== "connected"}
                className="mt-2 w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
              >
                {isSending ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
                {isSending ? "Mengirim..." : "Kirim Pesan"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
