"use client";

import React, { useState, useEffect } from "react";
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

export default function HomePage() {
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
    fetchPrayerTimes();
    fetchHadith();
    fetchMeme();

    // Initial fetch logs & set interval for auto-refresh
    fetchLogs();
    const logInterval = setInterval(() => fetchLogs(), 5000); // Update log tiap 5 detik
    return () => clearInterval(logInterval);
  }, []);

  // Formatter Tanggal untuk Log
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

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] overflow-y-auto w-full pb-24">
      {/* HEADER DASHBOARD */}
      <div className="mb-6 bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-2">
            <LayoutDashboard
              className="text-slate-900"
              size={28}
              strokeWidth={2.5}
            />
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Pusat Kendali Sistem NBI. Pantau server, jaringan, dan kelola pesan
            otomatis Anda.
          </p>
        </div>
      </div>

      {/* TOP WIDGET GRID (Sholat, Hadist, Meme) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 mb-6">
        {/* ================= 1. WIDGET JADWAL SHOLAT ================= */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                Jadwal Sholat
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {prayerData?.lokasi || "Memuat..."}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {prayerData?.tanggal || "..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between">
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
                        className={`flex justify-between items-center p-3 rounded-lg transition-all border ${
                          isCurrent
                            ? "bg-slate-900 text-slate-50 border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        <span className="font-semibold text-sm flex items-center gap-2">
                          {p.name}
                          {isCurrent && (
                            <span className="text-[10px] bg-white/20 border border-white/20 px-2 py-0.5 rounded-md font-medium tracking-wide">
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

                {/* INFO WAKTU SELANJUTNYA */}
                {nextPrayerIndex !== -1 && (
                  <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm text-slate-700 animate-in slide-in-from-bottom-2">
                    <span className="flex items-center gap-2 font-medium">
                      <ArrowRight size={16} className="text-slate-400" />{" "}
                      Selanjutnya:
                    </span>
                    <span className="bg-white px-3 py-1 rounded-md shadow-sm border border-slate-200 font-semibold text-slate-900">
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
        </div>

        {/* ================= 2. WIDGET HADIST HARIAN ================= */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col h-full relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
                <BookOpen size={18} />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                Hadist Hari Ini
              </h2>
            </div>
            <button
              onClick={fetchHadith}
              disabled={isLoadingHadith}
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
              title="Muat hadist lain"
            >
              <RefreshCw
                size={16}
                className={isLoadingHadith ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="flex-1 flex flex-col relative z-10">
            {isLoadingHadith ? (
              <div className="flex justify-center items-center flex-1 text-slate-400">
                <RefreshCw className="animate-spin" size={24} />
              </div>
            ) : hadith ? (
              <>
                <div
                  className="text-right text-2xl lg:text-3xl mb-5 leading-loose text-slate-900 font-serif"
                  dir="rtl"
                >
                  {hadith.text.ar}
                </div>
                <div className="text-sm text-slate-600 mb-6 leading-relaxed border-l-4 border-slate-900 pl-4 bg-slate-50/50 p-3 rounded-r-lg font-medium">
                  "{hadith.text.id}"
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200">
                    Grade: {hadith.grade}
                  </span>
                  <span className="bg-white text-slate-500 px-2.5 py-1.5 rounded-md border border-slate-200 line-clamp-1">
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

          <BookOpen
            className="absolute -bottom-10 -right-10 text-slate-50 opacity-50 rotate-12 transition-transform group-hover:scale-110 duration-500 pointer-events-none"
            size={200}
          />
        </div>

        {/* ================= 3. WIDGET MEME INDONESIA ================= */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col h-full xl:col-span-1 md:col-span-2 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
                <ImageIcon size={18} />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                Asupan Meme
              </h2>
            </div>
            <button
              onClick={fetchMeme}
              disabled={isLoadingMeme}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw
                size={14}
                className={isLoadingMeme ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Acak Lagi</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center bg-slate-50/50 rounded-lg border border-slate-200 overflow-hidden p-3">
            {isLoadingMeme ? (
              <div className="flex flex-col justify-center items-center h-48 text-slate-400">
                <RefreshCw className="animate-spin mb-3" size={24} />
                <span className="text-xs font-medium tracking-wide">
                  Mencari meme...
                </span>
              </div>
            ) : meme ? (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-full h-48 md:h-64 rounded-md overflow-hidden mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meme.url}
                    alt={meme.title}
                    className="w-full h-full object-contain bg-white border border-slate-100 rounded-md"
                    loading="lazy"
                  />
                </div>
                <div className="text-center w-full px-2">
                  <h3
                    className="text-sm font-semibold text-slate-900 line-clamp-1"
                    title={meme.title}
                  >
                    {meme.title}
                  </h3>
                  <a
                    href={meme.postLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 mt-1"
                  >
                    Sumber: r/indonesia <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm font-medium text-center py-10">
                Meme tidak ditemukan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 4. WIDGET SYSTEM LOGS (FULL WIDTH) ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col w-full h-[400px]">
        {/* Header Log */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm">
              <TerminalSquare size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                Catatan Aktivitas Sistem
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Log notifikasi dan perubahan status jaringan (20 Terakhir)
              </p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-md transition-colors disabled:opacity-50"
            title="Muat ulang log"
          >
            <RefreshCw
              size={16}
              className={isLoadingLogs ? "animate-spin" : ""}
            />
          </button>
        </div>

        {/* Konten Log List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
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
            <div className="space-y-3">
              {logs.map((log) => {
                // Konfigurasi style berdasarkan level log
                let logStyle = {
                  border: "border-slate-200",
                  bg: "bg-white",
                  icon: <Info size={16} className="text-slate-500" />,
                  titleColor: "text-slate-900",
                };

                if (log.level === "ERROR") {
                  logStyle = {
                    border: "border-red-200",
                    bg: "bg-red-50/50",
                    icon: <AlertCircle size={16} className="text-red-500" />,
                    titleColor: "text-red-700",
                  };
                } else if (log.level === "SUCCESS") {
                  logStyle = {
                    border: "border-emerald-200",
                    bg: "bg-emerald-50/50",
                    icon: (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ),
                    titleColor: "text-emerald-700",
                  };
                }

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border shadow-sm transition-colors hover:shadow-md ${logStyle.bg} ${logStyle.border}`}
                  >
                    <div className="mt-0.5 bg-white p-1.5 rounded-md shadow-sm border border-slate-100">
                      {logStyle.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-4">
                        <h4
                          className={`text-sm font-bold tracking-tight ${logStyle.titleColor}`}
                        >
                          {log.title}
                        </h4>
                        <span className="text-[11px] font-mono font-medium text-slate-500 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">
                          {formatLogDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
