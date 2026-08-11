import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Mengambil semua data perangkat saat halaman dimuat
export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: { type: true },
    });
    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

// POST: Menyimpan perangkat baru dari modal popup
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ipAddress, remark, xPos, yPos, typeName } = body;

    // Cari MasterTipe berdasarkan nama, jika tidak ada, buat baru
    let masterType = await prisma.masterType.findUnique({
      where: { name: typeName },
    });

    if (!masterType) {
      masterType = await prisma.masterType.create({
        data: { name: typeName },
      });
    }

    // Simpan Device baru ke database
    const newDevice = await prisma.device.create({
      data: {
        ipAddress,
        remark,
        xPos,
        yPos,
        typeId: masterType.id,
      },
      include: { type: true },
    });

    return NextResponse.json(newDevice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
