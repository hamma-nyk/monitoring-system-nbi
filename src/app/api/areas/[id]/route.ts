import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = await context.params;
    const areaId = params.id;
    const body = await req.json();

    const updated = await prisma.canvasArea.update({
      where: { id: areaId },
      data: {
        ...(body.shape !== undefined && { shape: body.shape }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.xPos !== undefined && { xPos: Number(body.xPos) }),
        ...(body.yPos !== undefined && { yPos: Number(body.yPos) }),
        ...(body.width !== undefined && { width: Number(body.width) }),
        ...(body.height !== undefined && { height: Number(body.height) }),
        ...(body.rotation !== undefined && { rotation: Number(body.rotation) }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.opacity !== undefined && { opacity: Number(body.opacity) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengupdate area" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = await context.params;
    const areaId = params.id;

    await prisma.canvasArea.delete({
      where: { id: areaId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus area" },
      { status: 500 },
    );
  }
}
