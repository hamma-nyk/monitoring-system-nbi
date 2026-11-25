import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.canvasSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, isInteractive: true },
    });
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan canvas" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const isInteractive = Boolean(body.isInteractive);

    const setting = await prisma.canvasSetting.upsert({
      where: { id: 1 },
      update: { isInteractive },
      create: { id: 1, isInteractive },
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan canvas" },
      { status: 500 },
    );
  }
}
