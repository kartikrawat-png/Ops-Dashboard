import { NextRequest, NextResponse } from "next/server";
import { calculateShippingTimeline } from "@/lib/calculateShippingTimeline";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing PO id" }, { status: 400 });
  }

  const timeline = await calculateShippingTimeline(id);

  // Serialise Date → ISO string so JSON.stringify doesn't lose it
  if (timeline.status === "pending") {
    return NextResponse.json({
      ...timeline,
      tentativeDate: timeline.tentativeDate.toISOString(),
    });
  }

  return NextResponse.json(timeline);
}
