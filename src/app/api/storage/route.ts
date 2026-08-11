import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const servers = await prisma.storageServer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(servers);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data storage" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const server = await prisma.storageServer.create({
      data: {
        name: data.name,
        type: data.type,
        ipAddress: data.ipAddress,
        apiKey: data.apiKey || null,
        smbUser: data.smbUser || null,
        smbPassword: data.smbPassword || null,
        status: "unknown",
      },
    });
    return NextResponse.json(server);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan storage" },
      { status: 500 },
    );
  }
}
