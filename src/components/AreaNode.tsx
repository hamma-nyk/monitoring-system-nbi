"use client";

import React, { memo, useRef, useState } from "react";
import { NodeProps, NodeResizer, useReactFlow } from "reactflow";
import { RotateCw } from "lucide-react";

const snapRotation = (deg: number): number => {
  // Normalize to [-180, 180]
  let normalized = ((deg + 180) % 360 + 360) % 360 - 180;
  const snapTargets = [0, 90, -90, 180, -180];
  for (const target of snapTargets) {
    if (Math.abs(normalized - target) <= 4) {
      return target === -180 ? 180 : target;
    }
  }
  return Math.round(normalized);
};

const AreaNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);

  const shape: string = data?.shape || "rectangle";
  const label: string = data?.label || "";
  const color: string = data?.color || "#3b82f6";
  const opacity: number = typeof data?.opacity === "number" ? data.opacity : 5;
  const rotation: number = typeof data?.rotation === "number" ? data.rotation : 0;
  const isZeroDeg = rotation === 0;

  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setIsRotating(true);
    let finalRotation = rotation;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      // 0 deg = top (12 o'clock)
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      finalRotation = snapRotation(rawAngle);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, rotation: finalRotation } }
            : node,
        ),
      );
    };

    const onPointerUp = async () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setIsRotating(false);

      try {
        await fetch(`/api/areas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rotation: finalRotation }),
        });
      } catch (error) {
        console.error("Gagal menyimpan rotasi area:", error);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleResizeEnd = async (
    _event: any,
    params: { x: number; y: number; width: number; height: number },
  ) => {
    try {
      await fetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xPos: params.x,
          yPos: params.y,
          width: params.width,
          height: params.height,
        }),
      });
    } catch (error) {
      console.error("Gagal menyimpan ukuran area:", error);
    }
  };

  const renderShape = () => {
    const commonProps = {
      fill: color,
      fillOpacity: Math.max(0, Math.min(100, opacity)) / 100,
      stroke: color,
      strokeWidth: 2,
      vectorEffect: "non-scaling-stroke" as const,
      strokeDasharray: "6 4",
    };

    switch (shape) {
      case "circle":
        return <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />;
      case "rounded":
        return (
          <rect x="2" y="2" width="96" height="96" rx="16" {...commonProps} />
        );
      case "diamond":
        return <polygon points="50,2 98,50 50,98 2,50" {...commonProps} />;
      case "triangle":
        return <polygon points="50,3 97,96 3,96" {...commonProps} />;
      case "hexagon":
        return (
          <polygon
            points="25,3 75,3 98,50 75,97 25,97 2,50"
            {...commonProps}
          />
        );
      case "rectangle":
      default:
        return (
          <rect x="2" y="2" width="96" height="96" rx="2" {...commonProps} />
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none">
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        lineStyle={{ borderColor: color }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: "#ffffff",
          border: `2px solid ${color}`,
        }}
        onResizeEnd={handleResizeEnd}
      />

      {/* GUIDELINE 0 DERAJAT SAAT ROTATE */}
      {(isRotating || (selected && isZeroDeg)) && isRotating && (
        <div className="pointer-events-none fixed-guideline absolute inset-0 flex items-center justify-center">
          <div
            className={`w-[140%] h-[1px] border-t border-dashed ${
              isZeroDeg ? "border-emerald-500" : "border-slate-400/70"
            }`}
          />
          <div
            className={`absolute h-[140%] w-[1px] border-l border-dashed ${
              isZeroDeg ? "border-emerald-500" : "border-slate-400/70"
            }`}
          />
        </div>
      )}

      {/* ROTATION HANDLE SAAT SELECTED */}
      {selected && (
        <div
          className="nodrag nopan absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center z-20"
          style={{ pointerEvents: "all" }}
        >
          <div
            onPointerDown={handleRotatePointerDown}
            className={`w-6 h-6 rounded-full border shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
              isZeroDeg
                ? "bg-emerald-50 border-emerald-400 text-emerald-600"
                : "bg-white border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900"
            }`}
            title="Putar Area (otomatis snap di 0°, 90°, 180°)"
          >
            <RotateCw size={12} />
          </div>
          <div className="w-[1px] h-3 bg-slate-300" />
          {isRotating && (
            <div
              className={`absolute -top-7 px-2 py-0.5 rounded text-[10px] font-mono font-semibold whitespace-nowrap shadow-sm border ${
                isZeroDeg
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-slate-900 text-white border-slate-800"
              }`}
            >
              {isZeroDeg ? "0° (Lurus)" : `${rotation}°`}
            </div>
          )}
        </div>
      )}

      {/* SHAPE SVG YANG BERPUTAR */}
      <div
        className="w-full h-full relative flex items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {renderShape()}
        </svg>

        {label && (
          <div
            className="absolute top-2.5 left-3 px-2 py-0.5 rounded text-xs font-semibold tracking-tight bg-white/85 backdrop-blur-xs border shadow-xs pointer-events-none"
            style={{ color, borderColor: `${color}40` }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AreaNode);
