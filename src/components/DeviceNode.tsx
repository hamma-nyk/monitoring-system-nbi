"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import {
  Server,
  Router,
  Monitor,
  Wifi,
  Printer,
  HardDrive,
  Box,
  Activity,
  Unplug,
  Smartphone,
} from "lucide-react";

const DeviceNode = ({ data }: any) => {
  // Render ikon dengan warna yang lebih soft ala shadcn
  const renderIcon = () => {
    const iconName = data.icon?.toLowerCase() || "monitor";
    const props = { size: 20, strokeWidth: 2 };

    switch (iconName) {
      case "router":
        return <Router {...props} className="text-blue-500" />;
      case "server":
        return <Server {...props} className="text-indigo-500" />;
      case "wifi":
        return <Wifi {...props} className="text-emerald-500" />;
      case "printer":
        return <Printer {...props} className="text-amber-500" />;
      case "harddrive":
        return <HardDrive {...props} className="text-violet-500" />;
      case "box":
        return <Box {...props} className="text-slate-500" />;
      case "smartphone":
        return <Smartphone {...props} className="text-rose-500" />;
      case "monitor":
      default:
        return <Monitor {...props} className="text-sky-500" />;
    }
  };

  const isOnline = data.status === "online";
  const isOffline = data.status === "offline";

  // Gaya handle (port) yang subtle namun interaktif saat node di-hover
  const handleStyle =
    "w-2.5 h-2.5 bg-white border-2 border-slate-200 transition-colors group-hover:border-blue-400 cursor-crosshair";

  return (
    <div className="relative group flex flex-col bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 w-40">
      {/* --- 4 PORT KONEKSI --- */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleStyle}
      />

      {/* --- HEADER: ICON & STATUS DOT --- */}
      <div className="flex items-start justify-between w-full mb-3">
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg shadow-sm">
          {renderIcon()}
        </div>

        {/* Indikator Status (Glowing Ring Effect) */}
        <div className="relative flex h-2.5 w-2.5 mt-1">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOnline
                ? "bg-emerald-500"
                : isOffline
                  ? "bg-rose-500"
                  : "bg-slate-300"
            }`}
          ></span>
        </div>
      </div>

      {/* --- KONTEN: NAMA & IP --- */}
      <div className="flex flex-col w-full text-left">
        <h3
          className="font-semibold text-sm text-slate-900 tracking-tight truncate"
          title={data.remark}
        >
          {data.remark}
        </h3>
        <p className="text-[11px] text-slate-500 font-mono font-medium mt-0.5 truncate">
          {data.ip}
        </p>
      </div>

      {/* --- FOOTER: BADGE LATENCY/RTO --- */}
      <div className="mt-3 w-full">
        {isOnline && data.latency !== undefined ? (
          <div className="inline-flex w-full items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-50/80 border border-emerald-100 text-emerald-700 text-[10px] font-semibold">
            <Activity size={12} className="text-emerald-500" />
            {data.latency} ms
          </div>
        ) : isOffline ? (
          <div className="inline-flex w-full items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-rose-50/80 border border-rose-100 text-rose-700 text-[10px] font-semibold">
            <Unplug size={12} className="text-rose-500" />
            RTO / Down
          </div>
        ) : (
          <div className="inline-flex w-full items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-semibold">
            Unknown
          </div>
        )}
      </div>
    </div>
  );
};

// Menggunakan memo untuk mencegah re-render yang tidak perlu saat node ditarik/digeser
export default memo(DeviceNode);
