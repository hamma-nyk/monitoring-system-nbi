"use client";

import React, { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
  useStore,
} from "reactflow";

const clampProgress = (t: number) => Math.max(0.05, Math.min(0.95, t));

const getPointAtProgress = (edgePath: string, progress: number) => {
  if (typeof document === "undefined") return null;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", edgePath);
  const totalLength = path.getTotalLength();
  if (!totalLength || !Number.isFinite(totalLength)) return null;
  const pt = path.getPointAtLength(totalLength * clampProgress(progress));
  return { x: pt.x, y: pt.y, path, totalLength };
};

const findClosestProgress = (
  edgePath: string,
  targetX: number,
  targetY: number,
) => {
  if (typeof document === "undefined") return 0.5;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", edgePath);
  const totalLength = path.getTotalLength();
  if (!totalLength || !Number.isFinite(totalLength)) return 0.5;

  let bestT = 0.5;
  let bestDist = Infinity;

  // Coarse search (50 samples)
  for (let i = 0; i <= 50; i++) {
    const t = 0.05 + (i / 50) * 0.9;
    const pt = path.getPointAtLength(totalLength * t);
    const dist = (pt.x - targetX) ** 2 + (pt.y - targetY) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
    }
  }

  // Fine search around bestT
  const step = 0.02;
  for (let t = Math.max(0.05, bestT - step); t <= Math.min(0.95, bestT + step); t += 0.004) {
    const pt = path.getPointAtLength(totalLength * t);
    const dist = (pt.x - targetX) ** 2 + (pt.y - targetY) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
    }
  }

  return Number(bestT.toFixed(4));
};

const PortEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const isInteractive = useStore((s) => s.nodesDraggable);

  const [edgePath, midX, midY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const portLabel: string | undefined = data?.portLabel;
  const labelProgress: number =
    typeof data?.labelProgress === "number" ? data.labelProgress : 0.5;
  const edgeColor: string = (style?.stroke as string) || "#94a3b8";

  const labelPos = useMemo(() => {
    const pt = getPointAtProgress(edgePath, labelProgress);
    if (pt) return { x: pt.x, y: pt.y };
    return { x: midX, y: midY };
  }, [edgePath, labelProgress, midX, midY]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    e.stopPropagation();
    e.preventDefault();

    let finalProgress = labelProgress;
    let hasMoved = false;
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (
        Math.abs(moveEvent.clientX - startClientX) > 2 ||
        Math.abs(moveEvent.clientY - startClientY) > 2
      ) {
        hasMoved = true;
      }

      const flowPos = screenToFlowPosition({
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });

      finalProgress = findClosestProgress(edgePath, flowPos.x, flowPos.y);

      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  labelProgress: finalProgress,
                },
              }
            : edge,
        ),
      );
    };

    const handlePointerUp = async () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (!hasMoved) return;

      try {
        await fetch(`/api/edges/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labelProgress: finalProgress,
          }),
        });
      } catch (error) {
        console.error("Gagal menyimpan posisi label port:", error);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {portLabel && (
        <EdgeLabelRenderer>
          <div
            onPointerDown={handlePointerDown}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)`,
              pointerEvents: "all",
              borderColor: edgeColor,
            }}
            className="nodrag nopan cursor-grab active:cursor-grabbing select-none rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-900 border shadow-sm hover:shadow transition-shadow"
            title="Geser sepanjang garis"
          >
            {portLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(PortEdge);
