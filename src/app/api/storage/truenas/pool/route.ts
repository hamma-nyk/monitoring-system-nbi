import { NextResponse } from "next/server";
import https from "https";
import http from "http";
import { connectTrueNas } from "@/lib/truenas";

// Fungsi normalisasi persis seperti logika Anda
function normalizeDataset(d: any) {
  const used = d.properties?.used?.parsed ?? d.used?.parsed;
  const available = d.properties?.available?.parsed ?? d.available?.parsed;

  if (used === undefined || available === undefined) {
    return null;
  }

  const totalBytes = used + available;
  if (!totalBytes) return null;

  return {
    name: d.name,
    type: "POOL",
    totalGB: (totalBytes / 1024 ** 3).toFixed(2),
    usedGB: (used / 1024 ** 3).toFixed(2),
    freeGB: (available / 1024 ** 3).toFixed(2),
    usedPercent: ((used / totalBytes) * 100).toFixed(1),
  };
}

function normalizeRestPool(p: any) {
  const size = Number(p.size);
  const allocated = Number(p.allocated);
  const free = Number(p.free);
  if (!Number.isFinite(size) || size <= 0) return null;

  const used = Number.isFinite(allocated) ? allocated : Math.max(0, size - free);
  const avail = Number.isFinite(free) ? free : Math.max(0, size - used);

  return {
    name: p.name,
    type: "POOL",
    totalGB: (size / 1024 ** 3).toFixed(2),
    usedGB: (used / 1024 ** 3).toFixed(2),
    freeGB: (avail / 1024 ** 3).toFixed(2),
    usedPercent: ((used / size) * 100).toFixed(1),
  };
}

function fetchTrueNasRest(
  url: string,
  apiKey: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        rejectUnauthorized: false,
        timeout: 8000,
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 500, body: data });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("REST API timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function fetchPoolsViaRest(ipAddress: string, apiKey: string) {
  const cleanHost = ipAddress.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const endpoints = [
    `https://${cleanHost}/api/v2.0/pool`,
    `http://${cleanHost}/api/v2.0/pool`,
  ];

  let lastError = "Gagal terhubung ke REST API TrueNAS";
  for (const endpoint of endpoints) {
    try {
      const res = await fetchTrueNasRest(endpoint, apiKey);
      if (res.status === 200) {
        const parsed = JSON.parse(res.body);
        if (Array.isArray(parsed)) {
          const pools = parsed.map(normalizeRestPool).filter(Boolean);
          if (pools.length > 0) return pools;
        }
      } else if (res.status === 401) {
        lastError = "TrueNAS Login failed: Invalid API Key";
      } else {
        lastError = `TrueNAS REST HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || lastError;
    }
  }
  throw new Error(lastError);
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

    const cleanKey = String(apiKey).trim();
    const url = ipAddress.includes("://")
      ? ipAddress.replace("http", "ws")
      : `ws://${ipAddress}/websocket`;

    try {
      // Prioritaskan REST API v2.0 (kompatibel penuh dengan TrueNAS SCALE & CORE)
      const pools = await fetchPoolsViaRest(ipAddress, cleanKey);
      return NextResponse.json({ success: true, pools });
    } catch {
      // Fallback ke WebSocket legacy (untuk TrueNAS CORE versi lama)
      const ws = await connectTrueNas({ url, apiKey: cleanKey });
      try {
        const datasetsRaw = await ws.call("zfs.dataset.query", [
          [],
          { extra: { properties: ["used", "available"] } },
        ]);
        const datasets = datasetsRaw.map(normalizeDataset).filter(Boolean);
        const rootPools = datasets.filter((d: any) => !d.name.includes("/"));
        return NextResponse.json({ success: true, pools: rootPools });
      } finally {
        ws.close();
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Koneksi ke TrueNAS gagal" },
      { status: 500 },
    );
  }
}
