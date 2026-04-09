import { NextRequest, NextResponse } from "next/server";
import { processPOUpload } from "@/lib/po-processor";

/**
 * POST /api/extract-po
 *
 * Accepts a PDF file, runs Claude extraction, and returns the structured
 * data — without writing anything to the database.
 * Used by the upload wizard so the user can review and enrich the data
 * (partner details, buy prices) before final submission.
 */
export async function POST(req: NextRequest) {
  try {
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

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const extraction = await processPOUpload(pdfBuffer, file.name);

    if (!extraction.success) {
      return NextResponse.json({ error: extraction.error }, { status: 422 });
    }

    return NextResponse.json({ extraction: extraction.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
