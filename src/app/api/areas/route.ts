import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const areas = await prisma.canvasArea.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(areas);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil area" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const area = await prisma.canvasArea.create({
      data: {
        id: data.id,
        shape: data.shape || "rectangle",
        label: data.label ?? "",
        xPos: Number(data.xPos) || 0,
        yPos: Number(data.yPos) || 0,
        width: Number(data.width) || 240,
        height: Number(data.height) || 160,
        rotation: Number(data.rotation) || 0,
        color: data.color || "#3b82f6",
        opacity:
          data.opacity !== undefined ? Number(data.opacity) : 5,
      },
    });
    return NextResponse.json(area);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan area" },
      { status: 500 },
    );
  }
}
