import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPOUpload } from "@/lib/po-processor";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse the multipart form data ──────────────────────────
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing required field: file (PDF)" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 400 }
      );
    }

    // ── 2. Read file into a Buffer ────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // ── 3. Send to Claude for extraction ──────────────────────────
    const extraction = await processPOUpload(pdfBuffer, file.name);

    if (!extraction.success) {
      return NextResponse.json(
        { error: extraction.error },
        { status: 422 }
      );
    }

    const { data } = extraction;

    // ── 4. Check for duplicate POID ───────────────────────────────
    const existing = await prisma.purchaseOrder.findUnique({
      where: { poid: data.poid },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Purchase order ${data.poid} already exists.` },
        { status: 409 }
      );
    }

    // ── 5. Persist to database as 'pending' ───────────────────────
    const order = await prisma.purchaseOrder.create({
      data: {
        poid: data.poid,
        date_created: new Date(data.date),
        status: "pending",
        total_revenue: data.total_revenue,
        raw_file_url: null, // populated later when file is stored in S3/Supabase Storage
        items: {
          create: data.items.map((item) => ({
            sku_name: item.sku_name,
            units_ordered: item.units_ordered,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(
      {
        message: "Purchase order extracted and saved.",
        order,
        extraction: data, // echo back what Claude extracted for transparency
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[upload-po]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
