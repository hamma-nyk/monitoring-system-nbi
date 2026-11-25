"use client";

import React, { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
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
  Cctv,
  Network,
  Waypoints,
  Globe,
} from "lucide-react";

const getPortTypeBadgeClass = (portType: string) => {
  switch (portType.toUpperCase()) {
    case "WAN":
      return "bg-amber-100 text-amber-700";
    case "POE":
      return "bg-violet-100 text-violet-700";
    case "SFP":
      return "bg-cyan-100 text-cyan-700";
    case "LAN":
    default:
      return "bg-slate-200/80 text-slate-600";
  }
};

const DeviceNode = ({ id, data }: any) => {
  const updateNodeInternals = useUpdateNodeInternals();

  const typeLower = data.type?.toLowerCase() || "";
  const iconLower = data.icon?.toLowerCase() || "";

  const isPortDevice =
    iconLower === "switch" ||
    typeLower === "switch" ||
    iconLower === "modem" ||
    typeLower === "modem" ||
    iconLower === "gateway" ||
    typeLower === "gateway" ||
    (typeof data.portCount === "number" && data.portCount > 0);

  const defaultPortCount =
    iconLower === "switch" || typeLower === "switch" ? 8 : 4;

  const portCount = isPortDevice
    ? Math.max(1, Math.min(64, Number(data.portCount) || defaultPortCount))
    : 0;

  const portTypesList: string[] = Array.isArray(data.portTypes)
    ? data.portTypes
    : [];
  const portVlansList: string[] = Array.isArray(data.portVlans)
    ? data.portVlans
    : [];

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, portCount, updateNodeInternals]);

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
      case "cctv":
        return <Cctv {...props} className="text-cyan-500" />;
      case "switch":
        return <Network {...props} className="text-teal-500" />;
      case "gateway":
        return <Waypoints {...props} className="text-orange-500" />;
      case "modem":
        return <Globe {...props} className="text-sky-600" />;
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

  const nodeWidthClass =
    portCount > 24 ? "w-64" : portCount > 0 ? "w-56" : "w-40";
  const portGridCols =
    portCount > 24
      ? "grid-cols-8"
      : portCount > 12
        ? "grid-cols-6"
        : "grid-cols-4";

  return (
    <div
      className={`relative group flex flex-col bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 ${nodeWidthClass}`}
    >
      {/* --- PORT KONEKSI STANDAR (NON-SWITCH) --- */}
      {portCount === 0 && (
        <>
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
        </>
      )}

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
          {data.ip ? data.ip : <span className="italic text-slate-400">Tanpa IP</span>}
        </p>
      </div>

      {/* --- FOOTER: BADGE LATENCY/RTO --- */}
      <div className="mt-3 w-full">
        {!data.ip ? (
          <div className="inline-flex w-full items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-semibold">
            Unmanaged / No IP
          </div>
        ) : isOnline && data.latency !== undefined ? (
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

      {/* --- SWITCH PORTS (CUSTOM PORT HANDLES) --- */}
      {portCount > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Ports
            </span>
            <span className="text-[10px] font-mono font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
              {portCount}P
            </span>
          </div>
          <div className={`grid ${portGridCols} gap-1.5`}>
            {Array.from({ length: portCount }, (_, idx) => {
              const portNum = idx + 1;
              const portId = `port-${portNum}`;
              const portType =
                portTypesList[idx] ||
                ((iconLower === "modem" || typeLower === "modem" || iconLower === "gateway" || typeLower === "gateway") && idx === 0
                  ? "WAN"
                  : "LAN");
              const rawVlan = (portVlansList[idx] || "").trim();
              const vlanDisplay = rawVlan
                ? rawVlan.toUpperCase() === "TRUNK"
                  ? "TRUNK"
                  : `V${rawVlan}`
                : "";
              const connectedColor = data.portColors?.[portId];
              return (
                <div
                  key={portNum}
                  className={`relative flex flex-col items-center justify-center border rounded py-1 px-0.5 transition-colors ${
                    connectedColor
                      ? ""
                      : "bg-slate-50 border-slate-200 hover:border-teal-400"
                  }`}
                  style={
                    connectedColor
                      ? {
                          borderColor: connectedColor,
                          backgroundColor: `${connectedColor}18`,
                        }
                      : undefined
                  }
                  title={
                    connectedColor
                      ? `Port ${portNum} (${portType}${vlanDisplay ? ` • ${vlanDisplay}` : ""}) - Terhubung`
                      : `Port ${portNum} (${portType}${vlanDisplay ? ` • ${vlanDisplay}` : ""})`
                  }
                >
                  <span
                    className={`text-[9px] font-mono font-semibold leading-none ${
                      connectedColor ? "" : "text-slate-700"
                    }`}
                    style={
                      connectedColor ? { color: connectedColor } : undefined
                    }
                  >
                    {portNum}
                  </span>
                  <span
                    className={`mt-0.5 px-1 rounded text-[7px] font-bold tracking-tight leading-tight ${
                      connectedColor
                        ? "text-white"
                        : getPortTypeBadgeClass(portType)
                    } ${vlanDisplay ? "mb-0.5" : "mb-1"}`}
                    style={
                      connectedColor
                        ? { backgroundColor: connectedColor }
                        : undefined
                    }
                  >
                    {portType}
                  </span>
                  {vlanDisplay && (
                    <span
                      className={`mb-1 px-1 rounded text-[6.5px] font-mono font-bold tracking-tight leading-tight ${
                        vlanDisplay === "TRUNK"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {vlanDisplay}
                    </span>
                  )}
                  <Handle
                    type="source"
                    position={Position.Bottom}
                    id={portId}
                    className={`!relative !left-auto !bottom-auto !transform-none w-2.5 h-2.5 border-2 transition-colors cursor-crosshair ${
                      connectedColor
                        ? ""
                        : "bg-white border-slate-300 hover:border-teal-500 hover:bg-teal-50"
                    }`}
                    style={
                      connectedColor
                        ? {
                            backgroundColor: connectedColor,
                            borderColor: connectedColor,
                          }
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Menggunakan memo untuk mencegah re-render yang tidak perlu saat node ditarik/digeser
export default memo(DeviceNode);
