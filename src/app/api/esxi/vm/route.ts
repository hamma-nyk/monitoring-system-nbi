import { NextResponse } from "next/server";
import { listVM, getVmDetail, vmPower } from "@/lib/esxi";

export async function POST(req: Request) {
  try {
    const { ipAddress, username, password, action, vmId, powerCommand } =
      await req.json();
    const cfg = { host: ipAddress, username, password };

    if (action === "list") {
      const vms = await listVM(cfg);
      return NextResponse.json({ success: true, vms });
    }

    if (action === "detail") {
      const detail = await getVmDetail(cfg, vmId);
      return NextResponse.json({ success: true, detail });
    }

    if (action === "power") {
      await vmPower(cfg, vmId, powerCommand);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error(`[VM Action Error]:`, error.message || error);
    return NextResponse.json(
      { error: error.message || "Gagal eksekusi perintah VM" },
      { status: 500 },
    );
  }
}
