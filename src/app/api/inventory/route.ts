import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const inventory = await prisma.inventory.findMany({
    orderBy: { sku_name: "asc" },
  });
  return NextResponse.json(inventory);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.inventory.create({
    data: {
      sku_name: body.sku_name,
      stock_level: body.stock_level ?? 0,
      lead_time_days: body.lead_time_days ?? 0,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
