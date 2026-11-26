import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [masterTypes, devices, edges, areas, canvasSetting] =
      await Promise.all([
        prisma.masterType.findMany({ orderBy: { id: "asc" } }),
        prisma.device.findMany({
          include: { type: true },
          orderBy: { id: "asc" },
        }),
        prisma.edge.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.canvasArea.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.canvasSetting.findUnique({ where: { id: 1 } }),
      ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      masterTypes: masterTypes.map((t) => ({
        name: t.name,
        icon: t.icon,
        color: t.color,
      })),
      devices: devices.map((d) => ({
        oldId: d.id.toString(),
        ipAddress: d.ipAddress,
        remark: d.remark,
        xPos: d.xPos,
        yPos: d.yPos,
        portCount: d.portCount,
        portTypes: d.portTypes,
        portVlans: d.portVlans,
        typeName: d.type?.name || "Device",
        typeIcon: d.type?.icon || "monitor",
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        color: e.color,
        labelOffsetX: e.labelOffsetX,
        labelOffsetY: e.labelOffsetY,
        labelProgress: e.labelProgress,
      })),
      areas: areas.map((a) => ({
        id: a.id,
        shape: a.shape,
        label: a.label,
        xPos: a.xPos,
        yPos: a.yPos,
        width: a.width,
        height: a.height,
        rotation: a.rotation,
        color: a.color,
        opacity: a.opacity,
      })),
      canvasSetting: {
        isInteractive: canvasSetting?.isInteractive ?? true,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Gagal export topologi:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor topologi jaringan" },
      { status: 500 },
    );
  }
}
