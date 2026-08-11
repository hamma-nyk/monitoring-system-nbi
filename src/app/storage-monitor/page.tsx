"use client";

import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Server,
  Plus,
  X,
  Trash2,
  Edit,
  Wifi,
  ShieldCheck,
  Key,
  User,
  Lock,
  Activity,
  Database,
  RefreshCw,
} from "lucide-react";

interface StorageServer {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  status: string;
  apiKey?: string;
  smbUser?: string;
  smbPassword?: string;
}

export default function StorageMonitorPage() {
  const [servers, setServers] = useState<StorageServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State penyimpanan data Pool (ID Server -> Array of Pools)
  const [livePools, setLivePools] = useState<Record<string, any[]>>({});

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState("");

  const initialForm = {
    name: "",
    type: "truenas",
    ipAddress: "",
    apiKey: "",
    smbUser: "",
    smbPassword: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // --- 1. Tarik Data Server (Sudah Mendukung SMB & TrueNAS) ---
  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();

      if (Array.isArray(data)) {
        setServers(data);

        // Looping untuk menarik data kapasitas (Pool) untuk KEDUA tipe
        data.forEach((server) => {
          if (server.type === "truenas" && server.apiKey) {
            fetchLivePoolData(server);
          } else if (server.type === "smb" && server.ipAddress) {
            fetchLivePoolData(server);
          }
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    // Auto-refresh pool stats setiap 30 detik
    const interval = setInterval(() => fetchServers(), 30000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. Tarik Data Pool (ZFS / Disk SMB) via API Internal ---
  const fetchLivePoolData = async (server: StorageServer) => {
    try {
      // Dinamis memilih Endpoint berdasarkan tipe server
      const endpoint =
        server.type === "truenas"
          ? "/api/storage/truenas/pool"
          : "/api/storage/smb/pool";

      // Dinamis menyusun data body
      const payload =
        server.type === "truenas"
          ? { ipAddress: server.ipAddress, apiKey: server.apiKey }
          : {
              ipAddress: server.ipAddress,
              smbUser: server.smbUser,
              smbPassword: server.smbPassword,
              name: server.name,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.pools) {
        setLivePools((prev) => ({ ...prev, [server.id]: data.pools }));
      }
    } catch (e) {
      console.error(`Gagal tarik data pool ${server.name}`);
    }
  };

  // --- 3. Simpan (Buat Baru atau Update) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditMode ? `/api/storage/${editId}` : "/api/storage";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData(initialForm);
        setIsEditMode(false);
        fetchServers(); // Refresh daftar setelah save
      } else {
        alert("Gagal menyimpan data server.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- 4. Mode Edit ---
  const openEditModal = (server: StorageServer) => {
    setFormData({
      name: server.name,
      type: server.type,
      ipAddress: server.ipAddress,
      apiKey: server.apiKey || "",
      smbUser: server.smbUser || "",
      smbPassword: server.smbPassword || "",
    });
    setEditId(server.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // --- 5. Hapus Storage ---
  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus server storage ini?")) {
      await fetch(`/api/storage/${id}`, { method: "DELETE" });
      fetchServers();
    }
  };

  return (
    <div className="h-full overflow-y-auto w-full bg-slate-50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] pb-24">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-2">
            <HardDrive className="text-slate-900" size={28} strokeWidth={2.5} />
            Storage Monitor
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xl">
            Kelola dan pantau kapasitas server penyimpanan (TrueNAS & SMB)
            secara real-time.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(initialForm);
            setIsEditMode(false);
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 flex w-full sm:w-auto justify-center items-center gap-2 bg-slate-900 hover:bg-slate-900/90 text-slate-50 px-4 py-2.5 rounded-md transition-all shadow-sm text-sm font-medium"
        >
          <Plus size={18} strokeWidth={2.5} /> Tambah Storage
        </button>
      </div>

      {/* Grid Cards Area */}
      {isLoading && servers.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-slate-400">
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center text-slate-500">
          <HardDrive
            size={48}
            className="mx-auto mb-4 text-slate-300"
            strokeWidth={1}
          />
          <p className="text-sm font-medium">
            Belum ada server storage yang ditambahkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const pools = livePools[server.id] || [];

            return (
              <div
                key={server.id}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between"
              >
                {/* Badge Tipe Storage */}
                <div className="absolute top-0 right-0 bg-slate-100 border-b border-l border-slate-200 text-slate-600 px-3 py-1.5 rounded-bl-lg rounded-tr-xl text-[10px] font-bold uppercase tracking-wider">
                  {server.type}
                </div>

                <div>
                  <div className="flex items-start gap-4 mb-5 mt-2">
                    <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
                      {server.type === "truenas" ? (
                        <Server size={24} />
                      ) : (
                        <HardDrive size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)] pr-12">
                        {server.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 mt-0.5">
                        <Wifi size={12} /> {server.ipAddress}
                      </div>
                    </div>
                  </div>

                  {/* POOL METRICS */}
                  {pools.length > 0 ? (
                    <div className="space-y-4 mb-4">
                      {pools.map((pool, idx) => {
                        const percent = parseFloat(pool.usedPercent);
                        const isWarning = percent > 80;
                        const isDanger = percent > 90;

                        // Warna indikator progres bar (Monochrome style dengan peringatan)
                        const barColor = isDanger
                          ? "bg-red-500"
                          : isWarning
                            ? "bg-amber-500"
                            : "bg-slate-900";

                        return (
                          <div
                            key={idx}
                            className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-200"
                          >
                            <div className="flex justify-between items-end mb-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <Database
                                  size={12}
                                  className="text-slate-400"
                                />{" "}
                                {pool.name}
                              </div>
                              <span className="text-xs font-bold text-slate-900">
                                {pool.usedPercent}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                              <div
                                className={`${barColor} h-full rounded-full transition-all duration-1000`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>

                            <div className="flex justify-between text-[10px] font-mono font-medium text-slate-500">
                              <span>Used: {pool.usedGB} GB</span>
                              <span>Free: {pool.freeGB} GB</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                      <Activity className="animate-pulse mb-2" size={20} />
                      <span className="text-xs font-medium tracking-wide">
                        Mengambil data storage...
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Card */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <ShieldCheck
                      size={14}
                      className={
                        server.status === "online"
                          ? "text-emerald-500"
                          : "text-slate-400"
                      }
                    />
                    {server.status === "unknown" ? "Standby" : server.status}
                  </span>

                  <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(server)}
                      className="h-8 w-8 flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                      title="Edit Server"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="h-8 w-8 flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md transition-colors"
                      title="Hapus Server"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM EDIT & TAMBAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                {isEditMode ? "Edit Storage" : "Registrasi Storage"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-5 flex flex-col gap-4 bg-slate-50/50"
            >
              {!isEditMode && (
                <div className="mb-2 flex p-1 bg-slate-100/50 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "truenas" })
                    }
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      formData.type === "truenas"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    TrueNAS (API)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "smb" })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      formData.type === "smb"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    SMB (Share)
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900">
                    Label / Nama Server
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                    placeholder="Cth: NAS Backup"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900">
                    IP Address{" "}
                    {formData.type === "smb" && "(Sertakan Folder/Share)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.type === "smb"
                        ? "192.168.10.10/Backup"
                        : "192.168.1.xxx"
                    }
                    value={formData.ipAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, ipAddress: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  />
                </div>

                {formData.type === "truenas" ? (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label className="block text-sm font-medium text-slate-900">
                      API Key (WebSocket)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key size={14} />
                      </div>
                      <input
                        type="password"
                        required
                        value={formData.apiKey}
                        onChange={(e) =>
                          setFormData({ ...formData, apiKey: e.target.value })
                        }
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-900">
                        SMB Username{" "}
                        <span className="text-xs font-normal text-slate-500">
                          (Opsional jika Public)
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User size={14} />
                        </div>
                        <input
                          type="text"
                          value={formData.smbUser}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              smbUser: e.target.value,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-900">
                        SMB Password{" "}
                        <span className="text-xs font-normal text-slate-500">
                          (Opsional jika Public)
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock size={14} />
                        </div>
                        <input
                          type="password"
                          value={formData.smbPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              smbPassword: e.target.value,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-9 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-9 px-4"
                >
                  {isEditMode ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
