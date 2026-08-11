import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Inisialisasi koneksi dengan Adapter PostgreSQL
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fungsi untuk Menerima Log dari Ping Engine dan Membatasi Maksimal 20 Log
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Buat log baru
    const newLog = await prisma.systemLog.create({
      data: {
        level: body.level,
        title: body.title,
        message: body.message,
      },
    });

    // 2. Ambil ID dari 20 log paling baru
    const recentLogs = await prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true }, // Hanya ambil ID-nya saja agar ringan
    });

    const recentIds = recentLogs.map((log) => log.id);

    // 3. Hapus semua log yang ID-nya TIDAK ADA di dalam daftar 20 log terbaru
    await prisma.systemLog.deleteMany({
      where: {
        id: {
          notIn: recentIds,
        },
      },
    });

    return NextResponse.json({ success: true, log: newLog });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan log" }, { status: 500 });
  }
}

// Fungsi untuk Menampilkan Log di Dashboard
export async function GET() {
  try {
    // Ambil maksimal 20 log terbaru
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil log" }, { status: 500 });
  }
}
