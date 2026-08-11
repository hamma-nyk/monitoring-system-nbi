import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// FUNGSI MENGHAPUS STORAGE
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = await context.params;
    await prisma.storageServer.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal hapus storage" }, { status: 500 });
  }
}

// FUNGSI EDIT / UPDATE STORAGE
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = await context.params;
    const data = await req.json();

    const updatedServer = await prisma.storageServer.update({
      where: { id: params.id },
      data: {
        name: data.name,
        type: data.type,
        ipAddress: data.ipAddress,
        apiKey: data.apiKey || null,
        smbUser: data.smbUser || null,
        smbPassword: data.smbPassword || null,
      },
    });

    return NextResponse.json(updatedServer);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal update storage" },
      { status: 500 },
    );
  }
}
