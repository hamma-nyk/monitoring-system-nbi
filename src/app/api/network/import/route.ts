import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body ||
      !Array.isArray(body.devices) ||
      !Array.isArray(body.edges) ||
      !Array.isArray(body.areas)
    ) {
      return NextResponse.json(
        { error: "Format file JSON tidak valid" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Pastikan semua MasterType tersedia
      const typeMap = new Map<string, number>();

      if (Array.isArray(body.masterTypes)) {
        for (const mt of body.masterTypes) {
          if (!mt?.name) continue;
          const upserted = await tx.masterType.upsert({
            where: { name: String(mt.name) },
            update: {},
            create: {
              name: String(mt.name),
              icon: mt.icon || "monitor",
              color: mt.color || null,
            },
          });
          typeMap.set(upserted.name, upserted.id);
        }
      }

      // 2. Bersihkan topologi lama (edges, devices, areas)
      await tx.edge.deleteMany({});
      await tx.device.deleteMany({});
      await tx.canvasArea.deleteMany({});

      // 3. Insert Devices baru dan petakan oldId -> newId
      const idMap = new Map<string, string>();
      let deviceCount = 0;

      for (const d of body.devices) {
        const typeName = String(d.typeName || "Device");
        let typeId = typeMap.get(typeName);
        if (!typeId) {
          const mt = await tx.masterType.upsert({
            where: { name: typeName },
            update: {},
            create: { name: typeName, icon: d.typeIcon || "monitor" },
          });
          typeId = mt.id;
          typeMap.set(typeName, typeId);
        }

        const normalizedIp =
          typeof d.ipAddress === "string" && d.ipAddress.trim() !== ""
            ? d.ipAddress.trim()
            : null;

        const created = await tx.device.create({
          data: {
            ipAddress: normalizedIp,
            remark: String(d.remark || "Device"),
            xPos: Number(d.xPos) || 0,
            yPos: Number(d.yPos) || 0,
            portCount:
              d.portCount !== undefined && d.portCount !== null
                ? Number(d.portCount)
                : null,
            portTypes: d.portTypes ?? undefined,
            portVlans: d.portVlans ?? undefined,
            typeId,
          },
        });

        if (d.oldId !== undefined && d.oldId !== null) {
          idMap.set(String(d.oldId), created.id.toString());
        }
        deviceCount++;
      }

      // 4. Insert Edges dengan source & target yang sudah di-remap
      let edgeCount = 0;
      for (let i = 0; i < body.edges.length; i++) {
        const e = body.edges[i];
        const newSource = idMap.get(String(e.source)) || String(e.source);
        const newTarget = idMap.get(String(e.target)) || String(e.target);

        if (!idMap.has(String(e.source)) || !idMap.has(String(e.target))) {
          continue;
        }

        await tx.edge.create({
          data: {
            id: `e-${newSource}-${newTarget}-${Date.now()}-${i}`,
            source: newSource,
            target: newTarget,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? null,
            color: e.color || "#94a3b8",
            labelOffsetX: e.labelOffsetX ?? 0,
            labelOffsetY: e.labelOffsetY ?? 0,
            labelProgress: e.labelProgress ?? 0.5,
          },
        });
        edgeCount++;
      }

      // 5. Insert Areas
      let areaCount = 0;
      for (let i = 0; i < body.areas.length; i++) {
        const a = body.areas[i];
        await tx.canvasArea.create({
          data: {
            id: String(a.id || `area-${Date.now()}-${i}`),
            shape: String(a.shape || "rectangle"),
            label: a.label ?? "",
            xPos: Number(a.xPos) || 0,
            yPos: Number(a.yPos) || 0,
            width: Number(a.width) || 240,
            height: Number(a.height) || 160,
            rotation: Number(a.rotation) || 0,
            color: String(a.color || "#3b82f6"),
            opacity: a.opacity !== undefined ? Number(a.opacity) : 5,
          },
        });
        areaCount++;
      }

      // 6. Update CanvasSetting jika ada
      if (typeof body.canvasSetting?.isInteractive === "boolean") {
        await tx.canvasSetting.upsert({
          where: { id: 1 },
          update: { isInteractive: body.canvasSetting.isInteractive },
          create: { id: 1, isInteractive: body.canvasSetting.isInteractive },
        });
      }

      return { deviceCount, edgeCount, areaCount };
    });

    return NextResponse.json({ success: true, counts: result });
  } catch (error: any) {
    console.error("Gagal import topologi:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengimpor topologi jaringan" },
      { status: 500 },
    );
  }
}
