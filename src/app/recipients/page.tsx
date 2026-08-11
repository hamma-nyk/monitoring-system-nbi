"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Bell, BellOff, X } from "lucide-react";

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk mengontrol Modal Form
  const [modal, setModal] = useState({ isOpen: false, isNew: true, id: null });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    isNotifEnabled: true,
  });

  // Fungsi untuk mengambil data penerima dari database
  const fetchRecipients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recipients");
      const data = await res.json();
      setRecipients(data);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Panggil fetchRecipients saat halaman pertama kali dimuat
  useEffect(() => {
    fetchRecipients();
  }, []);

  // Fungsi untuk Menyimpan Data (Bisa Tambah Baru atau Update yang sudah ada)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modal.isNew) {
        // API POST untuk Tambah Baru
        const res = await fetch("/api/recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // API PUT untuk Update
        const res = await fetch(`/api/recipients/${modal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      // Tutup modal dan refresh data tabel
      setModal({ ...modal, isOpen: false });
      fetchRecipients();
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan saat menyimpan data");
    }
  };

  // Fungsi untuk Menghapus Data
  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus penerima ini?")) return;
    try {
      await fetch(`/api/recipients/${id}`, { method: "DELETE" });
      fetchRecipients(); // Refresh tabel setelah dihapus
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  // Fungsi khusus untuk Toggle Status Notif langsung dari Tabel (Tanpa buka Modal)
  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      // Optimistic Update: Ubah UI langsung agar terasa cepat tanpa nunggu loading
      setRecipients((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isNotifEnabled: !currentStatus } : r,
        ),
      );

      // Kirim perubahan ke API Backend
      const res = await fetch(`/api/recipients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNotifEnabled: !currentStatus }),
      });

      if (!res.ok) throw new Error("Gagal update status di server");
    } catch (error) {
      // Jika gagal di server, kembalikan tampilan tabel ke status semula
      fetchRecipients();
      alert("Gagal merubah status notifikasi");
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 relative">
      {/* Header Halaman */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="text-blue-500" size={32} />
            Penerima Notifikasi
          </h1>
          <p className="text-slate-600 mt-2">
            Kelola daftar kontak WhatsApp yang akan menerima peringatan sistem.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", phone: "", isNotifEnabled: true });
            setModal({ isOpen: true, isNew: true, id: null });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} /> Tambah Kontak
        </button>
      </div>

      {/* Tabel Data Penerima */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">Nama / Keterangan</th>
              <th className="p-4 font-semibold">Nomor WhatsApp</th>
              <th className="p-4 font-semibold">Status Notifikasi</th>
              <th className="p-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-500 font-medium"
                >
                  Memuat data...
                </td>
              </tr>
            ) : recipients.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-500 font-medium"
                >
                  Belum ada penerima notifikasi yang ditambahkan.
                </td>
              </tr>
            ) : (
              recipients.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 font-medium text-slate-800">
                    {item.name}
                  </td>
                  <td className="p-4 text-slate-600 font-mono text-sm">
                    {item.phone}
                  </td>
                  <td className="p-4">
                    {/* Tombol Toggle Instan */}
                    <button
                      onClick={() => toggleStatus(item.id, item.isNotifEnabled)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        item.isNotifEnabled
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:shadow-sm"
                      }`}
                      title="Klik untuk mengubah status"
                    >
                      {item.isNotifEnabled ? (
                        <Bell size={14} />
                      ) : (
                        <BellOff size={14} />
                      )}
                      {item.isNotifEnabled ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setFormData({
                          name: item.name,
                          phone: item.phone,
                          isNotifEnabled: item.isNotifEnabled,
                        });
                        setModal({ isOpen: true, isNew: false, id: item.id });
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Data"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Data"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Popup Form Tambah & Edit */}
      {modal.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800">
                {modal.isNew ? "Tambah Penerima" : "Edit Penerima"}
              </h3>
              <button
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama / Jabatan
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  placeholder="Contoh: Budi (IT Support)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  // Memaksa input hanya menerima angka
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Contoh: 08123456789"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Gunakan format angka saja (Cth: 0812... atau 628...).
                </p>
              </div>

              {/* Checkbox Toggle Aktif/Nonaktif */}
              <div
                className="flex items-center gap-3 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    isNotifEnabled: !formData.isNotifEnabled,
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={formData.isNotifEnabled}
                  readOnly // Karena state diubah via onClick di div parent
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 pointer-events-none"
                />
                <label className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                  Aktifkan notifikasi untuk nomor ini
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded-xl transition-colors"
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
