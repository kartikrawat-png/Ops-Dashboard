import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const poId = req.nextUrl.searchParams.get("po_id");
  const items = await prisma.pOItem.findMany({
    where: poId ? { po_id: poId } : undefined,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.pOItem.create({
    data: {
      po_id: body.po_id,
      sku_name: body.sku_name,
      units_ordered: body.units_ordered,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
