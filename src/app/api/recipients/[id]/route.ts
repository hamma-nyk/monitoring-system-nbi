import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Update data penerima (termasuk toggle status notif)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await req.json();

    const updatedData = await prisma.recipient.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.phone && { phone: body.phone }),
        ...(body.isNotifEnabled !== undefined && {
          isNotifEnabled: body.isNotifEnabled,
        }),
      },
    });

    return NextResponse.json(updatedData);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengupdate data" },
      { status: 500 },
    );
  }
}

// Hapus data penerima
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await prisma.recipient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus data" },
      { status: 500 },
    );
  }
}
