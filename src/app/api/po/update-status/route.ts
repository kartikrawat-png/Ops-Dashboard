import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateStatusSchema } from "@/lib/schemas/po-status";

export async function PATCH(req: NextRequest) {
  // ── 1. Parse + validate body ───────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validation failed", fieldErrors },
      { status: 422 }
    );
  }

  const { id, status, comments } = parsed.data;

  // ── 2. Verify record exists ────────────────────────────────────
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: `Purchase order '${id}' not found.` },
      { status: 404 }
    );
  }

  // ── 3. Guard: don't allow re-reviewing already-finalized POs ──
  if (existing.status === "approved" || existing.status === "rejected") {
    return NextResponse.json(
      {
        error: `Cannot update a PO that is already '${existing.status}'.`,
      },
      { status: 409 }
    );
  }

  // ── 4. Persist state transition ───────────────────────────────
  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      // Store comments on edit_required; clear them on approve/reject
      comments: status === "edit_required" ? comments?.trim() : null,
    },
    include: { items: true },
  });

  return NextResponse.json({ order: updated });
}
