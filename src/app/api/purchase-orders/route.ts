import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { items: true },
    orderBy: { date_created: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const order = await prisma.purchaseOrder.create({
    data: {
      poid: body.poid,
      status: body.status ?? "pending",
      total_revenue: body.total_revenue ?? 0,
      raw_file_url: body.raw_file_url ?? null,
      items: body.items
        ? {
            create: body.items.map(
              (item: { sku_name: string; units_ordered: number }) => ({
                sku_name: item.sku_name,
                units_ordered: item.units_ordered,
              })
            ),
          }
        : undefined,
    },
    include: { items: true },
  });
  return NextResponse.json(order, { status: 201 });
}
