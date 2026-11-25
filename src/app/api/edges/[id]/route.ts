import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = await context.params;
    const edgeId = params.id;
    const body = await req.json();

    if (!edgeId) {
      return NextResponse.json(
        { error: "ID tidak ditemukan pada URL" },
        { status: 400 },
      );
    }

    const updatedEdge = await prisma.edge.update({
      where: { id: edgeId },
      data: {
        ...(body.color !== undefined && { color: body.color }),
        ...(body.labelOffsetX !== undefined && {
          labelOffsetX: Number(body.labelOffsetX),
        }),
        ...(body.labelOffsetY !== undefined && {
          labelOffsetY: Number(body.labelOffsetY),
        }),
        ...(body.labelProgress !== undefined && {
          labelProgress: Number(body.labelProgress),
        }),
      },
    });

    return NextResponse.json(updatedEdge);
  } catch (error) {
    console.error("Gagal mengupdate edge:", error);
    return NextResponse.json({ error: "Gagal update edge" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    // Menangani params di Next.js 14 (objek biasa) maupun Next.js 15 (Promise)
    const params = await context.params;
    const edgeId = params.id;

    if (!edgeId) {
      return NextResponse.json(
        { error: "ID tidak ditemukan pada URL" },
        { status: 400 },
      );
    }

    // Perintahkan Prisma untuk menghapus berdasarkan ID
    await prisma.edge.delete({
      where: { id: edgeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gagal menghapus edge:", error);
    return NextResponse.json({ error: "Gagal hapus edge" }, { status: 500 });
  }
}
