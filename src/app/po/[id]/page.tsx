import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import POVerification from "@/components/POVerification";

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let po;
  try {
    po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
  } catch {
    // DB not connected — return 404 gracefully
    notFound();
  }

  if (!po) notFound();

  // Serialise Date → string before passing to the client component
  const serialised = {
    ...po,
    date_created: po.date_created.toISOString(),
  };

  return (
    <div className="flex-1 p-8 grid grid-cols-12 gap-8 min-h-0">
      <POVerification po={serialised} />
    </div>
  );
}
