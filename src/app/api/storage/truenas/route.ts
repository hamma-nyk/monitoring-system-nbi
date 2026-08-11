import { NextResponse } from "next/server";
import { connectTrueNas } from "@/lib/truenas";

export async function POST(req: Request) {
  try {
    const { ipAddress, apiKey } = await req.json();

    if (!ipAddress || !apiKey) {
      return NextResponse.json(
        { error: "IP Address dan API Key wajib diisi" },
        { status: 400 },
      );
    }

    // Format URL ws:// atau wss://
    const url = ipAddress.includes("://")
      ? ipAddress.replace("http", "ws")
      : `ws://${ipAddress}/websocket`;

    // Coba koneksi ke TrueNAS
    const ws = await connectTrueNas({ url, apiKey });

    // Uji panggilan metode: Ambil informasi sistem
    const systemInfo = await ws.call("system.info");

    // Uji panggilan metode: Ambil daftar Pool Storage
    const pools = await ws.call("pool.query");

    // Tutup koneksi setelah selesai mengambil data
    ws.close();

    return NextResponse.json({
      success: true,
      system: systemInfo,
      pools: pools,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal terhubung ke server TrueNAS" },
      { status: 500 },
    );
  }
}
