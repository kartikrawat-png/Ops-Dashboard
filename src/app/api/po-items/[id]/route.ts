import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const item = await prisma.pOItem.update({
    where: { id },
    data: {
      ...(body.sku_name !== undefined && { sku_name: body.sku_name }),
      ...(body.units_ordered !== undefined && {
        units_ordered: body.units_ordered,
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
  await prisma.pOItem.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
