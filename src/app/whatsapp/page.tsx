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
  Users,
  Plus,
  Edit2,
  Trash2,
  Bell,
  BellOff,
  X,
  MessageSquare,
} from "lucide-react";

// Sesuaikan URL ini jika backend Anda berjalan di IP/Port yang berbeda
const API_BASE_URL = "http://192.168.10.25:3333/api";

export default function WhatsAppGatewayPage() {
  // ================= STATE WHATSAPP =================
  const [status, setStatus] = useState<string>("loading"); // loading, disconnected, qr_ready, connected, error
  const [user, setUser] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ================= STATE RECIPIENT =================
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);

  const [modal, setModal] = useState({ isOpen: false, isNew: true, id: null });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    isNotifEnabled: true,
  });

  // Logika Kunci Utama: Apakah WA terkoneksi?
  const isWaConnected = status === "connected";

  // ================= FUNGSI WHATSAPP =================
  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/status`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      setStatus(data.status);
      setUser(data.user);

      if (data.status === "qr_ready" && !qrCode) {
        fetchQrCode();
      }
      if (data.status === "connected" || data.status === "disconnected") {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Backend WA offline:", error);
      setStatus("error");
    }
  };

  const fetchQrCode = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/qr`);
      const data = await res.json();
      if (data.success && data.qr) setQrCode(data.qr);
    } catch (error) {
      console.error("Gagal mengambil QR:", error);
    }
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWaConnected) return;
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

  // ================= FUNGSI RECIPIENT =================
  const fetchRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      const res = await fetch("/api/recipients");
      const data = await res.json();
      if (Array.isArray(data)) setRecipients(data);
    } catch (error) {
      console.error("Gagal mengambil data penerima:", error);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWaConnected)
      return alert("WhatsApp terputus, tidak bisa menyimpan.");

    try {
      if (modal.isNew) {
        const res = await fetch("/api/recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Gagal tambah");
      } else {
        const res = await fetch(`/api/recipients/${modal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Gagal update");
      }
      setModal({ ...modal, isOpen: false });
      fetchRecipients();
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan saat menyimpan data");
    }
  };

  const handleDeleteRecipient = async (id: number) => {
    if (!isWaConnected) return;
    if (!confirm("Yakin ingin menghapus penerima ini?")) return;
    try {
      await fetch(`/api/recipients/${id}`, { method: "DELETE" });
      fetchRecipients();
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  const toggleStatusRecipient = async (id: number, currentStatus: boolean) => {
    if (!isWaConnected)
      return alert("WhatsApp terputus, tidak bisa merubah status.");

    try {
      setRecipients((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isNotifEnabled: !currentStatus } : r,
        ),
      );
      const res = await fetch(`/api/recipients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNotifEnabled: !currentStatus }),
      });
      if (!res.ok) throw new Error("Gagal update status di server");
    } catch (error) {
      fetchRecipients();
      alert("Gagal merubah status notifikasi");
    }
  };

  // ================= LIFECYCLE =================
  useEffect(() => {
    fetchRecipients();
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCode]);

  return (
    <div className="h-full overflow-y-auto w-full bg-slate-50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] pb-24">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-2">
            <MessageSquare
              className="text-slate-900"
              size={28}
              strokeWidth={2.5}
            />
            WhatsApp Gateway
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Kelola sesi koneksi bot dan daftar penerima peringatan (alert)
            sistem dari satu tempat.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* ================= KOLOM KIRI (WHATSAPP STATUS) ================= */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Card Status WA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 mb-4 font-[family-name:var(--font-plus-jakarta-sans)] flex items-center gap-2">
              <Smartphone size={18} className="text-slate-500" />
              Status Koneksi Bot
            </h2>

            {status === "loading" && (
              <div className="flex items-center justify-center gap-3 text-slate-500 bg-slate-50/50 p-6 rounded-md border border-slate-200">
                <RefreshCw className="animate-spin" size={20} />
                <span className="text-sm font-medium">
                  Memeriksa backend...
                </span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-start gap-3 text-red-600 bg-red-50/50 p-4 rounded-md border border-red-200">
                <ServerCrash size={20} className="mt-0.5" />
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    Backend Offline
                  </div>
                  <div className="text-xs mt-1 text-red-500/80 font-medium">
                    Pastikan layanan backend PM2 berjalan normal.
                  </div>
                </div>
              </div>
            )}

            {status === "disconnected" && (
              <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-4 rounded-md border border-slate-200">
                <XCircle className="text-slate-400 mt-0.5" size={20} />
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    Terputus
                  </div>
                  <div className="text-xs mt-1 text-slate-500 font-medium">
                    Sistem menunggu inisialisasi sesi baru...
                  </div>
                </div>
              </div>
            )}

            {status === "qr_ready" && (
              <div className="flex flex-col text-center items-center gap-2 text-amber-700 bg-amber-50/50 p-6 rounded-md border border-amber-200 animate-in fade-in zoom-in duration-300">
                <div className="text-sm font-bold uppercase tracking-wider">
                  Scan QR Code
                </div>
                <div className="text-xs text-amber-600/80 mb-3 font-medium">
                  Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan
                </div>
                {qrCode ? (
                  <div className="p-2 bg-white rounded-md border border-slate-200 shadow-sm inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-white rounded-md border border-slate-200 shadow-sm">
                    <QrCode
                      size={32}
                      className="text-amber-300 animate-pulse"
                    />
                  </div>
                )}
              </div>
            )}

            {status === "connected" && (
              <div className="flex flex-col justify-center items-center text-center gap-2 bg-emerald-50/50 p-6 rounded-md border border-emerald-200">
                <div className="w-12 h-12 bg-white text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center shadow-sm mb-1">
                  <CheckCircle2 size={24} />
                </div>
                <div className="font-semibold text-emerald-800 text-base tracking-tight">
                  Terhubung Aktif
                </div>
                <div className="text-sm text-emerald-600/80 font-mono font-medium mb-4">
                  +{user}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center gap-2 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 border border-slate-200 text-sm font-medium h-9 rounded-md transition-colors shadow-sm"
                >
                  <LogOut size={14} /> Keluar (Logout)
                </button>
              </div>
            )}
          </div>

          {/* Card Uji Coba Pengiriman */}
          <div
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-opacity duration-300 ${!isWaConnected ? "opacity-50 pointer-events-none grayscale-[50%]" : ""}`}
          >
            <h2 className="text-base font-semibold tracking-tight text-slate-900 mb-1 font-[family-name:var(--font-plus-jakarta-sans)] flex items-center gap-2">
              <Send size={18} className="text-slate-500" />
              Uji Coba Pengiriman
            </h2>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Kirim pesan percobaan ke nomor mana saja.
            </p>

            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nomor Tujuan / id-grup@g.us
                </label>
                <input
                  type="text"
                  required
                  disabled={!isWaConnected}
                  placeholder="Cth: 08123456789"
                  value={testNumber}
                  onChange={(e) =>
                    setTestNumber(e.target.value)
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Isi Pesan
                </label>
                <textarea
                  required
                  disabled={!isWaConnected}
                  rows={3}
                  placeholder="Ketik pesan percobaan di sini..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSending || !isWaConnected}
                className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-900/90 text-slate-50 text-sm font-medium h-9 rounded-md transition-colors disabled:bg-slate-300 shadow-sm mt-1"
              >
                {isSending ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  <Send size={14} />
                )}
                {isSending ? "Memproses..." : "Kirim Sekarang"}
              </button>
            </form>
          </div>
        </div>

        {/* ================= KOLOM KANAN (DAFTAR PENERIMA) ================= */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-2 font-[family-name:var(--font-plus-jakarta-sans)]">
                  <Users className="text-slate-700" size={20} />
                  Penerima Notifikasi
                </h2>
                {!isWaConnected ? (
                  <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Menunggu koneksi WhatsApp untuk mengelola data.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Daftar kontak yang akan menerima notifikasi otomatis.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setFormData({ name: "", phone: "", isNotifEnabled: true });
                  setModal({ isOpen: true, isNew: true, id: null });
                }}
                disabled={!isWaConnected}
                className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 h-9 rounded-md text-sm font-medium shadow-sm transition-colors ${
                  !isWaConnected
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-slate-900 hover:bg-slate-900/90 text-slate-50"
                }`}
              >
                <Plus size={16} /> Tambah Kontak
              </button>
            </div>

            <div className="flex-1 overflow-x-auto rounded-md border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Nama / Jabatan</th>
                    <th className="p-3.5">Nomor WhatsApp</th>
                    <th className="p-3.5">Status Notif</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingRecipients ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-400 text-sm font-medium"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : recipients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-400 text-sm font-medium"
                      >
                        Belum ada penerima terdaftar.
                      </td>
                    </tr>
                  ) : (
                    recipients.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-3.5 font-medium text-sm text-slate-900">
                          {item.name}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-xs font-medium">
                          {item.phone}
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() =>
                              toggleStatusRecipient(
                                item.id,
                                item.isNotifEnabled,
                              )
                            }
                            disabled={!isWaConnected}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all border ${
                              !isWaConnected
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            } ${
                              item.isNotifEnabled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {item.isNotifEnabled ? (
                              <Bell size={12} />
                            ) : (
                              <BellOff size={12} />
                            )}
                            {item.isNotifEnabled ? "Aktif" : "Mati"}
                          </button>
                        </td>
                        <td className="p-3.5 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setFormData({
                                name: item.name,
                                phone: item.phone,
                                isNotifEnabled: item.isNotifEnabled,
                              });
                              setModal({
                                isOpen: true,
                                isNew: false,
                                id: item.id,
                              });
                            }}
                            disabled={!isWaConnected}
                            className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-md disabled:opacity-50 transition-colors shadow-sm"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecipient(item.id)}
                            disabled={!isWaConnected}
                            className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 rounded-md disabled:opacity-50 transition-colors shadow-sm"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL FORM RECIPIENT ================= */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                {modal.isNew ? "Tambah Penerima" : "Edit Penerima"}
              </h3>
              <button
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveRecipient}
              className="p-5 flex flex-col gap-4 bg-slate-50/50"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Nama / Jabatan
                </label>
                <input
                  type="text"
                  required
                  disabled={!isWaConnected}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="Cth: Budi (IT Support)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  required
                  disabled={!isWaConnected}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 font-mono"
                  placeholder="Cth: 08123456789"
                />
                <p className="text-[11px] text-slate-500 font-medium">
                  Hanya angka. Awali dengan 08... atau 628...
                </p>
              </div>

              <div
                className={`flex items-center gap-3 mt-2 bg-white p-3 rounded-md border border-slate-200 transition-colors shadow-sm ${
                  isWaConnected
                    ? "cursor-pointer hover:border-slate-300"
                    : "opacity-50"
                }`}
                onClick={() =>
                  isWaConnected &&
                  setFormData({
                    ...formData,
                    isNotifEnabled: !formData.isNotifEnabled,
                  })
                }
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    formData.isNotifEnabled
                      ? "bg-slate-900 border-slate-900"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {formData.isNotifEnabled && (
                    <CheckCircle2
                      size={12}
                      className="text-white"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <label className="text-sm font-medium text-slate-900 cursor-pointer select-none">
                  Aktifkan Notifikasi Nomor Ini
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-9 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isWaConnected}
                  className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-9 px-4 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
