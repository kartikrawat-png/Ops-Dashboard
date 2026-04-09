import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.inventory.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.inventory.update({
    where: { id },
    data: {
      ...(body.sku_name !== undefined && { sku_name: body.sku_name }),
      ...(body.stock_level !== undefined && { stock_level: body.stock_level }),
      ...(body.lead_time_days !== undefined && {
        lead_time_days: body.lead_time_days,
      }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.inventory.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
