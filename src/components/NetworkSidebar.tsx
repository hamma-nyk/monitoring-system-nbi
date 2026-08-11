"use client";

import React, { useState } from "react";
import {
  Monitor,
  Router,
  Server,
  Wifi,
  Printer,
  HardDrive,
  Box,
  Plus,
  ChevronRight,
  ChevronLeft,
  Smartphone,
} from "lucide-react";

interface NetworkSidebarProps {
  masterTypes: any[];
  onManageClick: () => void;
}

export default function NetworkSidebar({
  masterTypes,
  onManageClick,
}: NetworkSidebarProps) {
  // State untuk kontrol Buka/Tutup Sidebar
  const [isOpen, setIsOpen] = useState(true);

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
    iconName: string,
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("remark", `${nodeType} Baru`);
    event.dataTransfer.setData("icon", iconName);
    event.dataTransfer.effectAllowed = "move";
  };

  // Render ikon monokrom ala shadcn
  const renderSidebarIcon = (iconName: string) => {
    const props = {
      size: 16,
      strokeWidth: 2,
      className: "text-slate-600 group-hover:text-slate-900 transition-colors",
    };

    switch (iconName?.toLowerCase()) {
      case "router":
        return <Router {...props} />;
      case "server":
        return <Server {...props} />;
      case "wifi":
        return <Wifi {...props} />;
      case "printer":
        return <Printer {...props} />;
      case "harddrive":
        return <HardDrive {...props} />;
      case "box":
        return <Box {...props} />;
      case "smartphone":
        return <Smartphone {...props} />;
      case "monitor":
      default:
        return <Monitor {...props} />;
    }
  };

  return (
    <aside
      className={`absolute right-0 top-0 h-full w-64 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* ============ TOMBOL TOGGLE HIDE/SHOW ============ */}
      {/* Tombol ini menempel di sisi kiri sidebar, sehingga tetap terlihat saat sidebar tergeser ke kanan */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 -left-10 h-10 w-10 bg-white border border-slate-200 border-r-0 rounded-l-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors z-50"
        title={isOpen ? "Sembunyikan Panel" : "Buka Panel"}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* ============ HEADER SIDEBAR ============ */}
      <div className="h-14 px-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
            Katalog Perangkat
          </h2>
          <p className="text-[11px] font-medium text-slate-500">
            Tarik (Drag) ke canvas
          </p>
        </div>
        <button
          onClick={onManageClick}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 text-slate-500 shadow-sm transition-colors"
          title="Kelola Master Tipe"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ============ LIST PERANGKAT ============ */}
      <div className="flex flex-col gap-2.5 p-4 overflow-y-auto flex-1 bg-white">
        {masterTypes.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 mt-4 border border-dashed border-slate-200 bg-slate-50 p-6 rounded-md">
            Katalog kosong.
            <br />
            Klik tombol <strong className="text-slate-600">+</strong> di atas.
          </div>
        ) : (
          masterTypes.map((type) => (
            <div
              key={type.id}
              className="group flex items-center gap-3 p-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm cursor-grab active:cursor-grabbing transition-all"
              onDragStart={(event) => onDragStart(event, type.name, type.icon)}
              draggable
            >
              <div className="flex items-center justify-center p-1.5 bg-slate-100 border border-slate-200 rounded-md group-hover:bg-white transition-colors">
                {renderSidebarIcon(type.icon)}
              </div>
              <span className="font-medium text-sm text-slate-700 tracking-tight group-hover:text-slate-900">
                {type.name}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
