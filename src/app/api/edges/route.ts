import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const edges = await prisma.edge.findMany();
    return NextResponse.json(edges);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil edges" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const edge = await prisma.edge.create({ data });
    return NextResponse.json(edge);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan edge" },
      { status: 500 },
    );
  }
}
