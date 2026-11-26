"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Clock,
  BookOpen,
  Image as ImageIcon,
  RefreshCw,
  MapPin,
  Calendar,
  ExternalLink,
  ArrowRight,
  TerminalSquare,
  AlertCircle,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RotateCcw,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Network,
  HardDrive,
  Server,
  CheckSquare,
  Bell,
  Activity,
  Wifi,
  WifiOff,
  Database,
  Check,
} from "lucide-react";

// === Tipe Data ===
interface PrayerTime {
  name: string;
  time: string;
}

interface Hadith {
  text: { ar: string; id: string };
  grade: string;
  takhrij: string;
}

interface MemeData {
  title: string;
  url: string;
  author: string;
  postLink: string;
}

interface SystemLog {
  id: number;
  level: "ERROR" | "SUCCESS" | "INFO";
  title: string;
  message: string;
  createdAt: string;
}

interface DeviceItem {
  id: number;
  ipAddress: string | null;
  remark: string;
  status: string;
  latency: number;
  type?: { name: string; icon: string };
}

interface StorageServerItem {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  status: string;
  apiKey?: string | null;
  smbUser?: string | null;
  smbPassword?: string | null;
}

interface PoolInfo {
  name: string;
  totalGB: string;
  usedGB: string;
  freeGB: string;
  usedPercent: string;
}

interface EsxiHostItem {
  id: string;
  name: string;
  ipAddress: string;
  username?: string;
  password?: string;
  status: string;
}

interface EsxiLiveMetric {
  status: "online" | "offline";
  cpuPercent?: number;
  ramPercent?: number;
  vmTotal?: number;
  vmRunning?: number;
}

interface TodoItem {
  id: number;
  kegiatan: string;
  deskripsi: string;
  progress: number;
  priority: string;
  status: string;
  endDate: string;
}

interface RecipientItem {
  id: number;
  name: string;
  phone: string;
  isNotifEnabled: boolean;
}

type WidgetSpan = "1" | "2" | "3";

interface WidgetConfig {
  id: string;
  visible: boolean;
  span: WidgetSpan;
}

const WIDGET_META: Record<
  string,
  { title: string; subtitle: string; defaultSpan: WidgetSpan }
> = {
  summary_kpi: {
    title: "Ringkasan Infrastruktur",
    subtitle: "Metrik real-time jaringan, storage, ESXi, todo & notifikasi",
    defaultSpan: "3",
  },
  network_status: {
    title: "Status Perangkat Jaringan",
    subtitle: "Ringkasan perangkat online, RTO/offline, dan latensi",
    defaultSpan: "1",
  },
  storage_pools: {
    title: "Kapasitas Storage Pool",
    subtitle: "Penggunaan disk TrueNAS & SMB secara live",
    defaultSpan: "1",
  },
  esxi_hosts: {
    title: "ESXi Virtualization Hosts",
    subtitle: "Status host VMware ESXi terdaftar",
    defaultSpan: "1",
  },
  todo_tasks: {
    title: "Todo List IT",
    subtitle: "Pekerjaan aktif berdasarkan prioritas & progres",
    defaultSpan: "1",
  },
  wa_recipients: {
    title: "Notifikasi WhatsApp",
    subtitle: "Penerima alert otomatis jaringan",
    defaultSpan: "1",
  },
  system_logs: {
    title: "Catatan Aktivitas Sistem",
    subtitle: "Log notifikasi & perubahan status (20 terakhir)",
    defaultSpan: "3",
  },
  prayer_times: {
    title: "Jadwal Sholat",
    subtitle: "Waktu sholat harian",
    defaultSpan: "1",
  },
  daily_hadith: {
    title: "Hadist Hari Ini",
    subtitle: "Kutipan hadist acak harian",
    defaultSpan: "1",
  },
  meme_feed: {
    title: "Asupan Meme",
    subtitle: "Hiburan ringan r/indonesia",
    defaultSpan: "1",
  },
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "summary_kpi", visible: true, span: "3" },
  { id: "network_status", visible: true, span: "1" },
  { id: "storage_pools", visible: true, span: "1" },
  { id: "esxi_hosts", visible: true, span: "1" },
  { id: "todo_tasks", visible: true, span: "1" },
  { id: "wa_recipients", visible: true, span: "1" },
  { id: "prayer_times", visible: true, span: "1" },
  { id: "system_logs", visible: true, span: "3" },
  { id: "daily_hadith", visible: true, span: "1" },
  { id: "meme_feed", visible: true, span: "2" },
];

const mergeLayoutWithDefaults = (saved: any): WidgetConfig[] => {
  if (!Array.isArray(saved)) return DEFAULT_LAYOUT;
  const validIds = new Set(Object.keys(WIDGET_META));
  const seen = new Set<string>();
  const cleaned: WidgetConfig[] = [];

  for (const item of saved) {
    if (!item || typeof item.id !== "string" || !validIds.has(item.id)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    cleaned.push({
      id: item.id,
      visible: typeof item.visible === "boolean" ? item.visible : true,
      span:
        item.span === "1" || item.span === "2" || item.span === "3"
          ? item.span
          : WIDGET_META[item.id].defaultSpan,
    });
  }

  for (const def of DEFAULT_LAYOUT) {
    if (!seen.has(def.id)) {
      cleaned.push(def);
    }
  }
  return cleaned;
};

export default function HomePage() {
  // === LAYOUT CUSTOMIZATION STATE ===
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // === INFRASTRUCTURE STATES ===
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [storages, setStorages] = useState<StorageServerItem[]>([]);
  const [livePools, setLivePools] = useState<Record<string, PoolInfo[]>>({});
  const [esxiHosts, setEsxiHosts] = useState<EsxiHostItem[]>([]);
  const [esxiMetrics, setEsxiMetrics] = useState<
    Record<string, EsxiLiveMetric>
  >({});
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [isLoadingInfra, setIsLoadingInfra] = useState(true);

  // === STATE SHOLAT ===
  const [prayerData, setPrayerData] = useState<{
    lokasi: string;
    tanggal: string;
    prayers: PrayerTime[];
  } | null>(null);
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState<number>(-1);
  const [nextPrayerIndex, setNextPrayerIndex] = useState<number>(-1);
  const [isLoadingPrayer, setIsLoadingPrayer] = useState(true);

  // === STATE HADIST ===
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [isLoadingHadith, setIsLoadingHadith] = useState(true);

  // === STATE MEME ===
  const [meme, setMeme] = useState<MemeData | null>(null);
  const [isLoadingMeme, setIsLoadingMeme] = useState(true);

  // === STATE SYSTEM LOGS ===
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // === SAVE LAYOUT TO DB & LOCALSTORAGE ===
  const persistLayout = useCallback(async (nextLayout: WidgetConfig[]) => {
    setLayout(nextLayout);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-layout-v1", JSON.stringify(nextLayout));
    }
    setIsSavingLayout(true);
    try {
      await fetch("/api/dashboard-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: nextLayout }),
      });
    } catch (e) {
      console.error("Gagal menyimpan layout dashboard:", e);
    } finally {
      setIsSavingLayout(false);
    }
  }, []);

  const toggleWidgetVisibility = (id: string) => {
    const next = layout.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w,
    );
    persistLayout(next);
  };

  const changeWidgetSpan = (id: string, span: WidgetSpan) => {
    const next = layout.map((w) => (w.id === id ? { ...w, span } : w));
    persistLayout(next);
  };

  const moveWidget = (id: string, direction: "up" | "down") => {
    const visibleItems = layout.filter((w) => w.visible);
    const hiddenItems = layout.filter((w) => !w.visible);
    const idx = visibleItems.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= visibleItems.length) return;

    const copy = [...visibleItems];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    persistLayout([...copy, ...hiddenItems]);
  };

  const handleWidgetDrop = (targetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) return;
    const copy = [...layout];
    const fromIdx = copy.findIndex((w) => w.id === draggedWidgetId);
    const toIdx = copy.findIndex((w) => w.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setDraggedWidgetId(null);
    persistLayout(copy);
  };

  const resetDefaultLayout = () => {
    persistLayout(DEFAULT_LAYOUT);
  };

  // === FETCH INFRASTRUCTURE DATA ===
  const fetchInfrastructure = useCallback(async () => {
    try {
      const [devRes, storRes, esxiRes, todoRes, recRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/storage"),
        fetch("/api/esxi"),
        fetch("/api/todo"),
        fetch("/api/recipients"),
      ]);

      const [devData, storData, esxiData, todoData, recData] =
        await Promise.all([
          devRes.json().catch(() => []),
          storRes.json().catch(() => []),
          esxiRes.json().catch(() => []),
          todoRes.json().catch(() => []),
          recRes.json().catch(() => []),
        ]);

      if (Array.isArray(devData)) setDevices(devData);
      if (Array.isArray(esxiData)) {
        setEsxiHosts(esxiData);
        esxiData.forEach(async (host: EsxiHostItem) => {
          if (!host.username || !host.password) return;
          try {
            const mRes = await fetch("/api/esxi/monitor", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ipAddress: host.ipAddress,
                username: host.username,
                password: host.password,
              }),
            });
            const mJson = await mRes.json();
            if (mJson.success) {
              setEsxiMetrics((prev) => ({
                ...prev,
                [host.id]: {
                  status: "online",
                  cpuPercent: mJson.usage?.cpuPercent,
                  ramPercent: mJson.usage?.ramPercent,
                  vmTotal: mJson.vms?.total,
                  vmRunning: mJson.vms?.running,
                },
              }));
            } else {
              setEsxiMetrics((prev) => ({
                ...prev,
                [host.id]: { status: "offline" },
              }));
            }
          } catch {
            setEsxiMetrics((prev) => ({
              ...prev,
              [host.id]: { status: "offline" },
            }));
          }
        });
      }
      if (Array.isArray(todoData)) setTodos(todoData);
      if (Array.isArray(recData)) setRecipients(recData);

      if (Array.isArray(storData)) {
        setStorages(storData);
        storData.forEach(async (server: StorageServerItem) => {
          try {
            const endpoint =
              server.type === "truenas"
                ? "/api/storage/truenas/pool"
                : "/api/storage/smb/pool";
            const payload =
              server.type === "truenas"
                ? { ipAddress: server.ipAddress, apiKey: server.apiKey }
                : {
                    ipAddress: server.ipAddress,
                    smbUser: server.smbUser,
                    smbPassword: server.smbPassword,
                    name: server.name,
                  };
            const poolRes = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const poolJson = await poolRes.json();
            if (poolJson.success && Array.isArray(poolJson.pools)) {
              setLivePools((prev) => ({
                ...prev,
                [server.id]: poolJson.pools,
              }));
            }
          } catch {
            // Abaikan error per server agar card lain tetap tampil
          }
        });
      }
    } catch (e) {
      console.error("Gagal memuat data infrastruktur:", e);
    } finally {
      setIsLoadingInfra(false);
    }
  }, []);

  // === 1. FETCH JADWAL SHOLAT ===
  const fetchPrayerTimes = async () => {
    setIsLoadingPrayer(true);
    try {
      const CITY_ID = "1408";
      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      const res = await fetch(
        `https://api.myquran.com/v2/sholat/jadwal/${CITY_ID}/${yyyy}/${mm}/${dd}`,
      );
      const json = await res.json();

      if (json.status) {
        const data = json.data;
        const jadwal = data.jadwal;

        const prayers = [
          { name: "Subuh", time: jadwal.subuh },
          { name: "Dzuhur", time: jadwal.dzuhur },
          { name: "Ashar", time: jadwal.ashar },
          { name: "Maghrib", time: jadwal.maghrib },
          { name: "Isya", time: jadwal.isya },
        ];

        setPrayerData({
          lokasi: data.lokasi,
          tanggal: jadwal.tanggal,
          prayers,
        });

        const now = new Date();
        const curTime = now.getHours() * 60 + now.getMinutes();
        const timeToMinutes = (timeStr: string) => {
          const [h, m] = timeStr.split(":").map(Number);
          return h * 60 + m;
        };

        let nIdx = -1;
        for (let i = 0; i < prayers.length; i++) {
          if (timeToMinutes(prayers[i].time) > curTime) {
            nIdx = i;
            break;
          }
        }

        let cIdx = 0;
        if (nIdx === -1) {
          cIdx = 4;
          nIdx = 0;
        } else if (nIdx === 0) {
          cIdx = 4;
        } else {
          cIdx = nIdx - 1;
        }

        setCurrentPrayerIndex(cIdx);
        setNextPrayerIndex(nIdx);
      }
    } catch (e) {
      console.error("Gagal load sholat", e);
    } finally {
      setIsLoadingPrayer(false);
    }
  };

  // === 2. FETCH HADIST RANDOM ===
  const fetchHadith = async () => {
    setIsLoadingHadith(true);
    try {
      const res = await fetch(
        `https://api.myquran.com/v3/hadis/enc/random?t=${new Date().getTime()}`,
      );
      const json = await res.json();
      if (json.data) setHadith(json.data);
    } catch (e) {
      console.error("Gagal load hadist", e);
    } finally {
      setIsLoadingHadith(false);
    }
  };

  // === 3. FETCH MEME RANDOM ===
  const fetchMeme = async () => {
    setIsLoadingMeme(true);
    try {
      const res = await fetch("https://meme-api.com/gimme/50");
      const json = await res.json();

      if (json.memes && json.memes.length > 0) {
        const randomIndex = Math.floor(Math.random() * json.memes.length);
        const selectedMeme = json.memes[randomIndex];

        setMeme({
          title: selectedMeme.title,
          url: selectedMeme.url,
          author: selectedMeme.author,
          postLink: selectedMeme.postLink,
        });
      }
    } catch (e) {
      console.error("Gagal load meme", e);
    } finally {
      setIsLoadingMeme(false);
    }
  };

  // === 4. FETCH SYSTEM LOGS ===
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (e) {
      console.error("Gagal load logs", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    // Load saved layout (localStorage instant + DB sync)
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("dashboard-layout-v1");
      if (cached) {
        try {
          setLayout(mergeLayoutWithDefaults(JSON.parse(cached)));
        } catch {
          // ignore
        }
      }
    }
    fetch("/api/dashboard-settings")
      .then((r) => r.json())
      .then((res) => {
        if (res?.layout) {
          const merged = mergeLayoutWithDefaults(res.layout);
          setLayout(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "dashboard-layout-v1",
              JSON.stringify(merged),
            );
          }
        }
      })
      .catch(() => {});

    fetchPrayerTimes();
    fetchHadith();
    fetchMeme();
    fetchInfrastructure();
    fetchLogs();

    const logInterval = setInterval(() => fetchLogs(), 5000);
    const infraInterval = setInterval(() => fetchInfrastructure(), 30000);
    return () => {
      clearInterval(logInterval);
      clearInterval(infraInterval);
    };
  }, [fetchInfrastructure]);

  // === COMPUTED METRICS ===
  const networkStats = useMemo(() => {
    const monitored = devices.filter((d) => Boolean(d.ipAddress));
    const online = monitored.filter((d) => d.status === "online");
    const offline = monitored.filter((d) => d.status === "offline");
    const unmanaged = devices.filter((d) => !d.ipAddress);
    const avgLatency =
      online.length > 0
        ? Math.round(
            online.reduce((acc, d) => acc + (d.latency || 0), 0) /
              online.length,
          )
        : 0;
    return {
      total: devices.length,
      monitored: monitored.length,
      online: online.length,
      offline: offline.length,
      unmanaged: unmanaged.length,
      avgLatency,
      offlineDevices: offline,
      highLatencyDevices: [...online]
        .sort((a, b) => (b.latency || 0) - (a.latency || 0))
        .slice(0, 5),
    };
  }, [devices]);

  const storageStats = useMemo(() => {
    const allPools = Object.values(livePools).flat();
    let totalGB = 0;
    let usedGB = 0;
    for (const p of allPools) {
      totalGB += parseFloat(p.totalGB) || 0;
      usedGB += parseFloat(p.usedGB) || 0;
    }
    const usedPercent =
      totalGB > 0 ? ((usedGB / totalGB) * 100).toFixed(1) : "0.0";
    return {
      serverCount: storages.length,
      poolCount: allPools.length,
      totalGB: totalGB.toFixed(0),
      usedGB: usedGB.toFixed(0),
      usedPercent,
    };
  }, [storages, livePools]);

  const esxiStats = useMemo(() => {
    const online = esxiHosts.filter(
      (h) => (esxiMetrics[h.id]?.status || h.status) === "online",
    ).length;
    const offline = esxiHosts.filter(
      (h) => (esxiMetrics[h.id]?.status || h.status) === "offline",
    ).length;
    return { total: esxiHosts.length, online, offline };
  }, [esxiHosts, esxiMetrics]);

  const todoStats = useMemo(() => {
    const open = todos.filter((t) => t.status !== "close");
    const urgent = open.filter((t) => t.priority === "urgent");
    return { total: todos.length, openCount: open.length, urgentCount: urgent.length, openList: open.slice(0, 5) };
  }, [todos]);

  const recipientStats = useMemo(() => {
    const active = recipients.filter((r) => r.isNotifEnabled);
    return { total: recipients.length, activeCount: active.length, list: recipients.slice(0, 6) };
  }, [recipients]);

  const formatLogDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getSpanClass = (span: WidgetSpan) => {
    switch (span) {
      case "3":
        return "col-span-1 md:col-span-2 xl:col-span-3";
      case "2":
        return "col-span-1 md:col-span-2";
      case "1":
      default:
        return "col-span-1";
    }
  };

  // === RENDER WIDGET BODY ===
  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case "summary_kpi":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/network-monitor"
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Jaringan
                </span>
                <Network size={16} className="text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {networkStats.total}
                </span>
                <span className="text-xs text-slate-500">perangkat</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {networkStats.online} Online
                </span>
                <span
                  className={`px-2 py-0.5 rounded border ${
                    networkStats.offline > 0
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {networkStats.offline} RTO
                </span>
                <span className="text-slate-500 font-mono">
                  ~{networkStats.avgLatency} ms
                </span>
              </div>
            </Link>

            <Link
              href="/storage-monitor"
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Storage
                </span>
                <HardDrive size={16} className="text-violet-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {storageStats.serverCount}
                </span>
                <span className="text-xs text-slate-500">
                  server ({storageStats.poolCount} pool)
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-mono text-slate-600 mb-1">
                  <span>{storageStats.usedGB} GB terpakai</span>
                  <span className="font-bold">{storageStats.usedPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(storageStats.usedPercent))}%` }}
                  />
                </div>
              </div>
            </Link>

            <Link
              href="/esxi-monitor"
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ESXi Hosts
                </span>
                <Server size={16} className="text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {esxiStats.total}
                </span>
                <span className="text-xs text-slate-500">host hypervisor</span>
              </div>
              <div className="flex items-center gap-2 mt-3 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {esxiStats.online} Online
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {esxiStats.offline} Offline
                </span>
              </div>
            </Link>

            <Link
              href="/todo"
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tugas & Alert WA
                </span>
                <CheckSquare size={16} className="text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {todoStats.openCount}
                </span>
                <span className="text-xs text-slate-500">todo aktif</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold">
                <span
                  className={`px-2 py-0.5 rounded border ${
                    todoStats.urgentCount > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {todoStats.urgentCount} Urgent
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {recipientStats.activeCount} WA Aktif
                </span>
              </div>
            </Link>
          </div>
        );

      case "network_status":
        return (
          <div className="flex flex-col h-full justify-between gap-4">
            {isLoadingInfra && devices.length === 0 ? (
              <div className="flex justify-center items-center h-36 text-slate-400">
                <RefreshCw className="animate-spin" size={22} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                    <div className="text-lg font-bold text-emerald-700">
                      {networkStats.online}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 uppercase">
                      Online
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100">
                    <div className="text-lg font-bold text-rose-700">
                      {networkStats.offline}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-600 uppercase">
                      RTO / Down
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-lg font-bold text-slate-700">
                      {networkStats.unmanaged}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">
                      Tanpa IP
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {networkStats.offlineDevices.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                        <WifiOff size={12} /> Perlu Pengecekan (Offline)
                      </div>
                      {networkStats.offlineDevices.slice(0, 4).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50/60 border border-rose-200 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {d.remark}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {d.ipAddress}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 shrink-0">
                            RTO
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {networkStats.highLatencyDevices.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Activity size={12} /> Latensi Tertinggi (Online)
                      </div>
                      {networkStats.highLatencyDevices.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate">
                              {d.remark}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {d.ipAddress}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                            {d.latency} ms
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/network-monitor"
                  className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Buka Network Monitor <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>
        );

      case "storage_pools":
        return (
          <div className="flex flex-col h-full justify-between gap-3">
            {storages.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">
                Belum ada server storage.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {storages.map((srv) => {
                  const pools = livePools[srv.id] || [];
                  return (
                    <div
                      key={srv.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {srv.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            {srv.ipAddress}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                          {srv.type}
                        </span>
                      </div>

                      {pools.length > 0 ? (
                        pools.map((p, idx) => {
                          const pct = parseFloat(p.usedPercent);
                          const barColor =
                            pct > 90
                              ? "bg-rose-500"
                              : pct > 80
                                ? "bg-amber-500"
                                : "bg-slate-900";
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className="text-slate-600 flex items-center gap-1">
                                  <Database size={10} /> {p.name}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {p.usedGB}/{p.totalGB} GB ({p.usedPercent}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`${barColor} h-full rounded-full`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          Memuat pool...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/storage-monitor"
              className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Buka Storage Monitor <ArrowRight size={13} />
            </Link>
          </div>
        );

      case "esxi_hosts":
        return (
          <div className="flex flex-col h-full justify-between gap-3">
            {esxiHosts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">
                Belum ada ESXi host.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {esxiHosts.map((host) => {
                  const metric = esxiMetrics[host.id];
                  const liveStatus: string = metric?.status || host.status;
                  const isUp = liveStatus === "online";
                  return (
                    <div
                      key={host.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {host.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Wifi size={10} /> {host.ipAddress}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${
                            isUp
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : liveStatus === "offline"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {liveStatus === "unknown" ? "Checking..." : liveStatus}
                        </span>
                      </div>
                      {isUp && metric && (
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200/70">
                          {metric.cpuPercent !== undefined && (
                            <span>CPU: {metric.cpuPercent}%</span>
                          )}
                          {metric.ramPercent !== undefined && (
                            <span>RAM: {metric.ramPercent}%</span>
                          )}
                          {metric.vmTotal !== undefined && (
                            <span>
                              VM: {metric.vmRunning ?? 0}/{metric.vmTotal} On
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/esxi-monitor"
              className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Buka ESXi Monitor <ArrowRight size={13} />
            </Link>
          </div>
        );

      case "todo_tasks":
        return (
          <div className="flex flex-col h-full justify-between gap-3">
            {todoStats.openList.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">
                Semua tugas selesai!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {todoStats.openList.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {t.kegiatan}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          t.priority === "urgent"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : t.priority === "medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-600">
                        {t.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/todo"
              className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Kelola Todo List <ArrowRight size={13} />
            </Link>
          </div>
        );

      case "wa_recipients":
        return (
          <div className="flex flex-col h-full justify-between gap-3">
            {recipientStats.list.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">
                Belum ada penerima notifikasi.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recipientStats.list.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {r.phone}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        r.isNotifEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {r.isNotifEnabled ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/recipients"
              className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Kelola Penerima WA <ArrowRight size={13} />
            </Link>
          </div>
        );

      case "prayer_times":
        return (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 mb-4 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {prayerData?.lokasi || "Memuat..."}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {prayerData?.tanggal || "..."}
              </span>
            </div>
            {isLoadingPrayer ? (
              <div className="flex justify-center items-center h-40 text-slate-400">
                <RefreshCw className="animate-spin" size={24} />
              </div>
            ) : prayerData ? (
              <>
                <div className="space-y-2">
                  {prayerData.prayers.map((p, idx) => {
                    const isCurrent = idx === currentPrayerIndex;
                    return (
                      <div
                        key={p.name}
                        className={`flex justify-between items-center p-2.5 rounded-lg transition-all border ${
                          isCurrent
                            ? "bg-slate-900 text-slate-50 border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        <span className="font-semibold text-sm flex items-center gap-2">
                          {p.name}
                          {isCurrent && (
                            <span className="text-[10px] bg-white/20 border border-white/20 px-2 py-0.5 rounded-md font-medium">
                              Sekarang
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-mono text-sm font-semibold ${
                            isCurrent ? "text-slate-50" : "text-slate-900"
                          }`}
                        >
                          {p.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {nextPrayerIndex !== -1 && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ArrowRight size={14} className="text-slate-400" />
                      Selanjutnya:
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded border border-slate-200 font-semibold text-slate-900">
                      {prayerData.prayers[nextPrayerIndex].name} (
                      {prayerData.prayers[nextPrayerIndex].time})
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-red-500 text-sm text-center py-10 font-medium">
                Gagal memuat jadwal
              </div>
            )}
          </div>
        );

      case "daily_hadith":
        return (
          <div className="flex-1 flex flex-col relative">
            <div className="flex justify-end mb-2">
              <button
                onClick={fetchHadith}
                disabled={isLoadingHadith}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                title="Muat hadist lain"
              >
                <RefreshCw
                  size={15}
                  className={isLoadingHadith ? "animate-spin" : ""}
                />
              </button>
            </div>
            {isLoadingHadith ? (
              <div className="flex justify-center items-center flex-1 text-slate-400 py-10">
                <RefreshCw className="animate-spin" size={24} />
              </div>
            ) : hadith ? (
              <>
                <div
                  className="text-right text-xl lg:text-2xl mb-4 leading-loose text-slate-900 font-serif"
                  dir="rtl"
                >
                  {hadith.text.ar}
                </div>
                <div className="text-sm text-slate-600 mb-4 leading-relaxed border-l-4 border-slate-900 pl-3 bg-slate-50/50 p-2.5 rounded-r-lg font-medium">
                  &ldquo;{hadith.text.id}&rdquo;
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                    Grade: {hadith.grade}
                  </span>
                  <span className="bg-white text-slate-500 px-2.5 py-1 rounded-md border border-slate-200 line-clamp-1">
                    {hadith.takhrij}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-red-500 text-sm text-center py-10 font-medium">
                Gagal memuat hadist
              </div>
            )}
          </div>
        );

      case "meme_feed":
        return (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-end mb-2">
              <button
                onClick={fetchMeme}
                disabled={isLoadingMeme}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw
                  size={13}
                  className={isLoadingMeme ? "animate-spin" : ""}
                />
                <span>Acak Lagi</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center bg-slate-50/50 rounded-lg border border-slate-200 overflow-hidden p-3">
              {isLoadingMeme ? (
                <div className="flex flex-col justify-center items-center h-44 text-slate-400">
                  <RefreshCw className="animate-spin mb-2" size={22} />
                  <span className="text-xs font-medium">Mencari meme...</span>
                </div>
              ) : meme ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full h-48 md:h-56 rounded-md overflow-hidden mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meme.url}
                      alt={meme.title}
                      className="w-full h-full object-contain bg-white border border-slate-100 rounded-md"
                      loading="lazy"
                    />
                  </div>
                  <h3
                    className="text-sm font-semibold text-slate-900 line-clamp-1 text-center"
                    title={meme.title}
                  >
                    {meme.title}
                  </h3>
                  <a
                    href={meme.postLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mt-1"
                  >
                    Sumber: r/indonesia <ExternalLink size={10} />
                  </a>
                </div>
              ) : (
                <div className="text-slate-400 text-sm text-center py-10">
                  Meme tidak ditemukan.
                </div>
              )}
            </div>
          </div>
        );

      case "system_logs":
        return (
          <div className="flex flex-col h-[340px]">
            <div className="flex justify-end mb-2">
              <button
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                title="Muat ulang log"
              >
                <RefreshCw
                  size={15}
                  className={isLoadingLogs ? "animate-spin" : ""}
                />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingLogs && logs.length === 0 ? (
                <div className="flex justify-center items-center h-full text-slate-400">
                  <RefreshCw className="animate-spin" size={24} />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-slate-400">
                  <TerminalSquare size={32} className="mb-2 opacity-50" />
                  <span className="text-sm font-medium">
                    Belum ada catatan aktivitas.
                  </span>
                </div>
              ) : (
                logs.map((log) => {
                  let logStyle = {
                    border: "border-slate-200",
                    bg: "bg-white",
                    icon: <Info size={15} className="text-slate-500" />,
                    titleColor: "text-slate-900",
                  };

                  if (log.level === "ERROR") {
                    logStyle = {
                      border: "border-red-200",
                      bg: "bg-red-50/50",
                      icon: <AlertCircle size={15} className="text-red-500" />,
                      titleColor: "text-red-700",
                    };
                  } else if (log.level === "SUCCESS") {
                    logStyle = {
                      border: "border-emerald-200",
                      bg: "bg-emerald-50/50",
                      icon: (
                        <CheckCircle2 size={15} className="text-emerald-500" />
                      ),
                      titleColor: "text-emerald-700",
                    };
                  }

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border shadow-xs ${logStyle.bg} ${logStyle.border}`}
                    >
                      <div className="mt-0.5 bg-white p-1.5 rounded-md border border-slate-100 shrink-0">
                        {logStyle.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <h4
                            className={`text-xs font-bold tracking-tight ${logStyle.titleColor}`}
                          >
                            {log.title}
                          </h4>
                          <span className="text-[10px] font-mono font-medium text-slate-500 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">
                            {formatLogDate(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getWidgetIcon = (id: string) => {
    switch (id) {
      case "summary_kpi":
        return <LayoutDashboard size={17} />;
      case "network_status":
        return <Network size={17} />;
      case "storage_pools":
        return <HardDrive size={17} />;
      case "esxi_hosts":
        return <Server size={17} />;
      case "todo_tasks":
        return <CheckSquare size={17} />;
      case "wa_recipients":
        return <Bell size={17} />;
      case "system_logs":
        return <TerminalSquare size={17} />;
      case "prayer_times":
        return <Clock size={17} />;
      case "daily_hadith":
        return <BookOpen size={17} />;
      case "meme_feed":
        return <ImageIcon size={17} />;
      default:
        return <LayoutDashboard size={17} />;
    }
  };

  const visibleWidgets = layout.filter((w) => w.visible);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] overflow-y-auto w-full pb-24">
      {/* HEADER DASHBOARD */}
      <div className="mb-6 bg-white p-5 lg:p-7 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-1">
            <LayoutDashboard
              className="text-slate-900"
              size={26}
              strokeWidth={2.5}
            />
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Pusat Kendali Infrastruktur NBI — pantau jaringan, storage, ESXi,
            tugas, dan aktivitas sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isEditingLayout && (
            <button
              type="button"
              onClick={resetDefaultLayout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={14} /> Reset Default
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditingLayout(!isEditingLayout)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              isEditingLayout
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {isEditingLayout ? (
              <>
                <Check size={14} /> Selesai Edit
                {isSavingLayout ? " (Menyimpan...)" : ""}
              </>
            ) : (
              <>
                <SlidersHorizontal size={14} /> Edit Layout
              </>
            )}
          </button>
        </div>
      </div>

      {/* PANEL CUSTOMIZER CARD (SAAT MODE EDIT) */}
      {isEditingLayout && (
        <div className="mb-6 bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pilih Card yang Ditampilkan
              </h2>
              <p className="text-xs text-slate-500">
                Klik card untuk menampilkan/menyembunyikan, lalu seret (drag)
                atau gunakan tombol panah & ukuran kolom pada tiap card di
                bawah.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {layout.map((item) => {
              const meta = WIDGET_META[item.id];
              if (!meta) return null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleWidgetVisibility(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    item.visible
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* GRID WIDGETS RESPONSIVE */}
      {visibleWidgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
          Semua card disembunyikan. Klik <strong>Edit Layout</strong> di atas
          untuk memunculkan kembali.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
          {visibleWidgets.map((widget, idx) => {
            const meta = WIDGET_META[widget.id];
            if (!meta) return null;

            return (
              <div
                key={widget.id}
                draggable={isEditingLayout}
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => {
                  if (isEditingLayout) e.preventDefault();
                }}
                onDrop={() => handleWidgetDrop(widget.id)}
                onDragEnd={() => setDraggedWidgetId(null)}
                className={`bg-white rounded-xl p-5 lg:p-6 shadow-sm border flex flex-col transition-all ${getSpanClass(
                  widget.span,
                )} ${
                  isEditingLayout
                    ? "border-dashed border-slate-400 ring-1 ring-slate-200 cursor-move"
                    : "border-slate-200"
                } ${draggedWidgetId === widget.id ? "opacity-50" : ""}`}
              >
                {/* Header Card */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isEditingLayout && (
                      <GripVertical
                        size={16}
                        className="text-slate-400 shrink-0"
                      />
                    )}
                    <div className="p-2 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-xs shrink-0">
                      {getWidgetIcon(widget.id)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm lg:text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)] truncate">
                        {meta.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Kontrol Edit Layout per Card */}
                  {isEditingLayout && (
                    <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveWidget(widget.id, "up")}
                        className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30"
                        title="Geser naik"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === visibleWidgets.length - 1}
                        onClick={() => moveWidget(widget.id, "down")}
                        className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30"
                        title="Geser turun"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                      {(["1", "2", "3"] as WidgetSpan[]).map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => changeWidgetSpan(widget.id, sp)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            widget.span === sp
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-white"
                          }`}
                          title={
                            sp === "3"
                              ? "Lebar Penuh"
                              : `Lebar ${sp} Kolom`
                          }
                        >
                          {sp === "3" ? "Full" : `${sp}K`}
                        </button>
                      ))}
                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className="p-1 rounded hover:bg-rose-50 text-rose-500"
                        title="Sembunyikan card"
                      >
                        <EyeOff size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Konten Card */}
                <div className="flex-1 flex flex-col">
                  {renderWidgetContent(widget.id)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
