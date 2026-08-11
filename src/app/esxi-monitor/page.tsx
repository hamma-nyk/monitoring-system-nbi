"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Plus,
  X,
  Trash2,
  Edit,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  RefreshCw,
  ShieldCheck,
  Play,
  Square,
  RotateCw,
  Info,
  Power,
  Monitor,
  ArrowRight,
} from "lucide-react";

interface EsxiHost {
  id: string;
  name: string;
  ipAddress: string;
  username: string;
  password?: string;
  status: string;
}

export default function EsxiMonitorPage() {
  const [hosts, setHosts] = useState<EsxiHost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveMetrics, setLiveMetrics] = useState<Record<string, any>>({});

  // Form Host State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState("");
  const initialForm = {
    name: "",
    ipAddress: "",
    username: "root",
    password: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // === STATE VM MANAGER ===
  const [vmModalOpen, setVmModalOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<EsxiHost | null>(null);
  const [vmList, setVmList] = useState<any[]>([]);
  const [isLoadingVms, setIsLoadingVms] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // State VM Detail Modal
  const [vmDetailModal, setVmDetailModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  // ================= FETCH LOGIC =================
  const fetchHosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/esxi");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHosts(data);
        data.forEach((host) => {
          if (host.username && host.password) fetchLiveMetrics(host);
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
    const interval = setInterval(() => fetchHosts(), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMetrics = async (host: EsxiHost) => {
    try {
      const res = await fetch("/api/esxi/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: host.ipAddress,
          username: host.username,
          password: host.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLiveMetrics((prev) => ({ ...prev, [host.id]: data }));
      }
    } catch (e) {
      console.error(`Gagal tarik data ESXi ${host.name}`);
    }
  };

  // ================= CRUD HOST =================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditMode ? `/api/esxi/${editId}` : "/api/esxi";
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
        fetchHosts();
      }
    } catch (error) {
      alert("Gagal menyimpan data host.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus Server ESXi ini?")) {
      await fetch(`/api/esxi/${id}`, { method: "DELETE" });
      fetchHosts();
    }
  };

  // ================= VM MANAGER LOGIC =================
  const openVmManager = async (host: EsxiHost) => {
    setSelectedHost(host);
    setVmModalOpen(true);
    fetchVmList(host);
  };

  const fetchVmList = async (host: EsxiHost) => {
    setIsLoadingVms(true);
    try {
      const res = await fetch("/api/esxi/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: host.ipAddress,
          username: host.username,
          password: host.password,
          action: "list",
        }),
      });
      const data = await res.json();
      if (data.success) setVmList(data.vms);
    } catch (e) {
      alert("Gagal mengambil list VM");
    } finally {
      setIsLoadingVms(false);
    }
  };

  const handleVmPower = async (
    vmId: string,
    powerCommand: "on" | "off" | "reboot",
  ) => {
    const actionName =
      powerCommand === "on"
        ? "menyalakan"
        : powerCommand === "off"
          ? "mematikan"
          : "me-restart";
    if (!confirm(`Yakin ingin ${actionName} VM ini?`)) return;

    setActionLoadingId(vmId);
    try {
      const res = await fetch("/api/esxi/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: selectedHost?.ipAddress,
          username: selectedHost?.username,
          password: selectedHost?.password,
          action: "power",
          vmId,
          powerCommand,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Perintah ${powerCommand} terkirim!`);
        setTimeout(() => selectedHost && fetchVmList(selectedHost), 3000);
      } else {
        alert("Gagal: " + data.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchVmDetail = async (vmId: string) => {
    setActionLoadingId(vmId);
    try {
      const res = await fetch("/api/esxi/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: selectedHost?.ipAddress,
          username: selectedHost?.username,
          password: selectedHost?.password,
          action: "detail",
          vmId,
        }),
      });
      const data = await res.json();
      if (data.success) setVmDetailModal({ isOpen: true, data: data.detail });
    } catch (e) {
      alert("Gagal mengambil detail VM");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}j ${m}m`;
  };

  return (
    <div className="h-full overflow-y-auto w-full bg-slate-50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] pb-24">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-2">
            <Server className="text-slate-900" size={28} strokeWidth={2.5} />
            ESXi Monitor
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Kelola dan pantau server hypervisor VMware ESXi secara real-time via
            SSH.
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
          <Plus size={18} strokeWidth={2.5} /> Tambah Host
        </button>
      </div>

      {/* HOSTS GRID */}
      {isLoading && hosts.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-slate-400">
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : hosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center text-slate-500">
          <Server
            size={48}
            className="mx-auto mb-4 text-slate-300"
            strokeWidth={1}
          />
          <p className="text-sm font-medium">
            Belum ada Server ESXi yang ditambahkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {hosts.map((host) => {
            const metrics = liveMetrics[host.id];

            return (
              <div
                key={host.id}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex gap-4 items-center">
                      <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
                        <Server size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                          {host.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 mt-0.5">
                          {host.ipAddress}
                        </div>
                      </div>
                    </div>
                  </div>

                  {metrics ? (
                    <div className="space-y-5 animate-in fade-in duration-500">
                      {/* CPU & RAM Bar */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 flex gap-1.5 items-center uppercase tracking-wider">
                              <Cpu size={12} /> CPU
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {metrics.usage.cpu.percent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-slate-900 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${metrics.usage.cpu.percent}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 flex gap-1.5 items-center uppercase tracking-wider">
                              <MemoryStick size={12} /> RAM
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {metrics.usage.memory.percent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-slate-900 h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${metrics.usage.memory.percent}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-2 font-mono font-medium flex justify-between">
                            <span>{metrics.usage.memory.usedGB}G</span>
                            <span>{metrics.usage.memory.totalGB}G</span>
                          </div>
                        </div>
                      </div>

                      {/* DATASTORES */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-slate-500 flex gap-1.5 items-center uppercase tracking-wider">
                          <HardDrive size={12} /> DATASTORES
                        </span>
                        {metrics.datastores.map((ds: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 text-sm"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-slate-800 text-xs">
                                {ds.name}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-600">
                                {ds.usedPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                              <div
                                className={`${ds.usedPercent > 85 ? "bg-red-500" : "bg-slate-900"} h-full rounded-full transition-all duration-1000`}
                                style={{ width: `${ds.usedPercent}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono font-medium text-slate-500">
                              <span>Used: {ds.usedGB}G</span>
                              <span>Free: {ds.freeGB}G</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* VM STATUS BUTTON */}
                      <button
                        onClick={() => openVmManager(host)}
                        className="w-full flex justify-between items-center bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors text-slate-900 p-3.5 rounded-lg group"
                      >
                        <div className="flex gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold font-mono text-slate-900">
                              {metrics.vms.running}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              Running
                            </div>
                          </div>
                          <div className="text-center opacity-60">
                            <div className="text-xl font-bold font-mono text-slate-900">
                              {metrics.vms.stopped}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              Stopped
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider">
                          Kelola VM <ArrowRight size={16} />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Activity className="animate-pulse mb-3" size={24} />
                      <span className="text-xs font-medium tracking-wide">
                        Menghubungkan SSH...
                      </span>
                    </div>
                  )}
                </div>

                {/* FOOTER CARD */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <ShieldCheck
                      size={14}
                      className={
                        metrics ? "text-emerald-500" : "text-slate-400"
                      }
                    />
                    {metrics ? "SSH Connected" : "Standby"}
                  </span>

                  <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setFormData({
                          name: host.name,
                          ipAddress: host.ipAddress,
                          username: host.username,
                          password: host.password || "",
                        });
                        setEditId(host.id);
                        setIsEditMode(true);
                        setIsModalOpen(true);
                      }}
                      className="h-8 w-8 flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                      title="Edit Host"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(host.id)}
                      className="h-8 w-8 flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md transition-colors"
                      title="Hapus Host"
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

      {/* ================= MODAL VM MANAGER ================= */}
      {vmModalOpen && selectedHost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)] flex items-center gap-2">
                  <Monitor size={18} className="text-slate-700" /> Virtual
                  Machines
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono font-medium">
                  {selectedHost.name} ({selectedHost.ipAddress})
                </p>
              </div>
              <button
                onClick={() => setVmModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-5 bg-slate-50/30">
              {isLoadingVms ? (
                <div className="flex flex-col justify-center items-center py-20 text-slate-400">
                  <RefreshCw className="animate-spin mb-3" size={28} />
                  <p className="text-xs font-medium tracking-wide">
                    Menarik data mesin virtual...
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Nama VM</th>
                        <th className="py-3 px-4">OS Config</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi Power</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vmList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-sm font-medium text-slate-400"
                          >
                            Tidak ada VM ditemukan.
                          </td>
                        </tr>
                      ) : (
                        vmList.map((vm) => (
                          <tr
                            key={vm.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-3 px-4 text-slate-500 font-mono text-xs font-medium">
                              {vm.id}
                            </td>
                            <td className="py-3 px-4 font-semibold text-sm text-slate-900">
                              {vm.name}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-xs font-medium">
                              {vm.os}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-max border ${
                                  vm.status === "ON"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                <Power size={12} strokeWidth={3} /> {vm.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right flex justify-end gap-2">
                              {/* Tombol Info */}
                              <button
                                onClick={() => fetchVmDetail(vm.id)}
                                disabled={actionLoadingId === vm.id}
                                className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-md disabled:opacity-50 transition-colors"
                                title="Detail Info"
                              >
                                {actionLoadingId === vm.id ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Info size={14} />
                                )}
                              </button>

                              {/* Tombol Power ON */}
                              {vm.status === "OFF" && (
                                <button
                                  onClick={() => handleVmPower(vm.id, "on")}
                                  disabled={actionLoadingId === vm.id}
                                  className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600 rounded-md disabled:opacity-50 transition-colors"
                                  title="Power ON"
                                >
                                  <Play
                                    size={14}
                                    className="fill-emerald-600"
                                  />
                                </button>
                              )}

                              {/* Tombol Restart & Power OFF */}
                              {vm.status === "ON" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleVmPower(vm.id, "reboot")
                                    }
                                    disabled={actionLoadingId === vm.id}
                                    className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-amber-600 rounded-md disabled:opacity-50 transition-colors"
                                    title="Restart"
                                  >
                                    <RotateCw size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleVmPower(vm.id, "off")}
                                    disabled={actionLoadingId === vm.id}
                                    className="h-8 w-8 flex items-center justify-center border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-red-600 rounded-md disabled:opacity-50 transition-colors"
                                    title="Power OFF"
                                  >
                                    <Square
                                      size={14}
                                      className="fill-red-600"
                                    />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL VM DETAIL (INFO) ================= */}
      {vmDetailModal.isOpen && vmDetailModal.data && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-slate-50">
              <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2 font-[family-name:var(--font-plus-jakarta-sans)]">
                <Info size={16} /> Detail Virtual Machine
              </h3>
              <button
                onClick={() => setVmDetailModal({ isOpen: false, data: null })}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 bg-slate-50/50">
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Guest OS
                </div>
                <div className="font-semibold text-slate-900 text-sm">
                  {vmDetailModal.data.guestFullName}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  IP Address
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md inline-block">
                  {vmDetailModal.data.ip}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Power State
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {vmDetailModal.data.powerState}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Uptime
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {formatUptime(vmDetailModal.data.uptimeSeconds)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  VMware Tools
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {vmDetailModal.data.tools}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                onClick={() => setVmDetailModal({ isOpen: false, data: null })}
                className="w-full flex justify-center items-center h-9 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL FORM TAMBAH/EDIT HOST ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                {isEditMode ? "Edit ESXi Host" : "Tambah ESXi Host"}
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
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Nama Server
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="Cth: Datacenter Utama"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  IP Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, ipAddress: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="192.168.x.x"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900">
                    SSH Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900">
                    SSH Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  />
                </div>
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
