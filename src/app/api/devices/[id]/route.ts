import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT: Mengupdate posisi X, Y atau IP/Remark
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Di Next.js 15+, params harus di-await terlebih dahulu
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await req.json();

    const updatedDevice = await prisma.device.update({
      where: { id },
      data: {
        ...(body.ipAddress !== undefined && {
          ipAddress:
            typeof body.ipAddress === "string" && body.ipAddress.trim() !== ""
              ? body.ipAddress.trim()
              : null,
        }),
        ...(body.remark && { remark: body.remark }),
        ...(body.xPos !== undefined && { xPos: body.xPos }),
        ...(body.yPos !== undefined && { yPos: body.yPos }),
        ...(body.portCount !== undefined && {
          portCount: body.portCount === null ? null : Number(body.portCount),
        }),
        ...(body.portTypes !== undefined && {
          portTypes: body.portTypes,
        }),
        ...(body.portVlans !== undefined && {
          portVlans: body.portVlans,
        }),
      },
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

// DELETE: Menghapus perangkat
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Di Next.js 15+, params harus di-await terlebih dahulu
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await prisma.device.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus data" },
      { status: 500 },
    );
  }
}
