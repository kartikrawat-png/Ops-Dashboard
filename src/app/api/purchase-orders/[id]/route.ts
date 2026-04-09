import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(body.poid !== undefined && { poid: body.poid }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.total_revenue !== undefined && {
        total_revenue: body.total_revenue,
      }),
      ...(body.raw_file_url !== undefined && {
        raw_file_url: body.raw_file_url,
      }),
    },
    include: { items: true },
  });
  return NextResponse.json(order);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
