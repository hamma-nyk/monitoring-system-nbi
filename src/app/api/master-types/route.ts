import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const types = await prisma.masterType.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(types);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat tipe" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, icon } = await req.json(); // Ambil icon dari request
    const newType = await prisma.masterType.create({
      data: { name, icon: icon || "monitor" },
    });
    return NextResponse.json(newType);
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat tipe" }, { status: 500 });
  }
}
