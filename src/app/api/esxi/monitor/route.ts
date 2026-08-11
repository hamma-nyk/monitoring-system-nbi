import { NextResponse } from "next/server";
import { getHostUsage, getDatastore, getVmSummary } from "@/lib/esxi";

export async function POST(req: Request) {
  try {
    const { ipAddress, username, password } = await req.json();
    const cfg = { host: ipAddress, username, password };

    // EKSEKUSI BERURUTAN (Satu per satu)
    // Mencegah ESXi menolak koneksi karena terlalu banyak sesi SSH bersamaan
    const usage = await getHostUsage(cfg);
    const datastores = await getDatastore(cfg);
    const vms = await getVmSummary(cfg);

    return NextResponse.json({ success: true, usage, datastores, vms });
  } catch (error: any) {
    // Menampilkan error asli di terminal PM2 / Next.js agar mudah dilacak
    console.error(`[ESXi Error - ${req.url}]:`, error.message || error);

    return NextResponse.json(
      {
        error: error.message || "Gagal koneksi SSH ke ESXi",
      },
      { status: 500 },
    );
  }
}
