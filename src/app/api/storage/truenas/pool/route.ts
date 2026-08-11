import { NextResponse } from "next/server";
import { connectTrueNas } from "@/lib/truenas";

// Fungsi normalisasi persis seperti logika Anda
function normalizeDataset(d: any) {
  const used = d.properties?.used?.parsed;
  const available = d.properties?.available?.parsed;

  if (used === undefined || available === undefined) {
    return null;
  }

  const totalBytes = used + available;

  return {
    name: d.name,
    type: "POOL",
    totalGB: (totalBytes / 1024 ** 3).toFixed(2),
    usedGB: (used / 1024 ** 3).toFixed(2),
    freeGB: (available / 1024 ** 3).toFixed(2),
    usedPercent: ((used / totalBytes) * 100).toFixed(1),
  };
}

export async function POST(req: Request) {
  try {
    const { ipAddress, apiKey } = await req.json();
    if (!ipAddress || !apiKey) {
      return NextResponse.json(
        { error: "Kredensial tidak lengkap" },
        { status: 400 },
      );
    }

    const url = ipAddress.includes("://")
      ? ipAddress.replace("http", "ws")
      : `ws://${ipAddress}/websocket`;
    const ws = await connectTrueNas({ url, apiKey });

    try {
      // Menarik data dataset ZFS
      const datasetsRaw = await ws.call("zfs.dataset.query", [
        [],
        { extra: { properties: ["used", "available"] } },
      ]);
      const datasets = datasetsRaw.map(normalizeDataset).filter(Boolean);

      // Trik Jitu: Kita ambil dataset "root" saja (yang namanya tidak mengandung garis miring '/').
      // Ini otomatis mendapatkan nama Pool utama tanpa harus hardcode daftar namanya.
      const rootPools = datasets.filter((d: any) => !d.name.includes("/"));

      return NextResponse.json({ success: true, pools: rootPools });
    } finally {
      ws.close();
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Koneksi ke TrueNAS gagal" },
      { status: 500 },
    );
  }
}
