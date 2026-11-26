import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.dashboardSetting.findUnique({
      where: { id: 1 },
    });
    return NextResponse.json(setting || { id: 1, layout: null });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan dashboard" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.layout)) {
      return NextResponse.json(
        { error: "Format layout tidak valid" },
        { status: 400 },
      );
    }

    const setting = await prisma.dashboardSetting.upsert({
      where: { id: 1 },
      update: { layout: body.layout },
      create: { id: 1, layout: body.layout },
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan dashboard" },
      { status: 500 },
    );
  }
}
