import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ambil semua data penerima
export async function GET() {
  try {
    const data = await prisma.recipient.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

// Tambah penerima baru
export async function POST(req: Request) {
  try {
    const { name, phone, isNotifEnabled } = await req.json();
    const newData = await prisma.recipient.create({
      data: { name, phone, isNotifEnabled },
    });
    return NextResponse.json(newData);
  } catch (error: any) {
    // Tangani error jika nomor HP duplikat
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Nomor WA sudah terdaftar" },
        { status: 400 },
      );
    return NextResponse.json({ error: "Gagal menambah data" }, { status: 500 });
  }
}
