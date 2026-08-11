import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const hosts = await prisma.esxiHost.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hosts);
}

export async function POST(req: Request) {
  const data = await req.json();
  const host = await prisma.esxiHost.create({ data });
  return NextResponse.json(host);
}
