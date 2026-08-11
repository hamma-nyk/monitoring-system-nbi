import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const data = await req.json();
  const host = await prisma.esxiHost.update({ where: { id: params.id }, data });
  return NextResponse.json(host);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  await prisma.esxiHost.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
