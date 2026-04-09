import Anthropic from "@anthropic-ai/sdk";
import { POExtractionSchema, type POExtraction } from "@/lib/schemas/po-upload";

const anthropic = new Anthropic();       // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = `You are a purchase-order data extraction engine.

Given a purchase order document (PDF), extract exactly:
1. **poid** – the Purchase Order ID / number (string).
2. **date** – the PO date in ISO-8601 format (YYYY-MM-DD).
3. **total_revenue** – the total dollar amount on the PO (number, no currency symbol).
4. **items** – an array of SKU line items, each with:
   - **sku_name** (string) – the product / SKU name or code.
   - **units_ordered** (integer) – quantity ordered.

Return ONLY valid JSON matching this schema — no markdown, no commentary:
{
  "poid": "string",
  "date": "string (YYYY-MM-DD)",
  "total_revenue": number,
  "items": [{ "sku_name": "string", "units_ordered": integer }]
}`;

/**
 * Sends a PDF buffer to Claude 3.5 Sonnet for structured PO extraction,
 * then validates the result against our Zod schema.
 */
export async function processPOUpload(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ success: true; data: POExtraction } | { success: false; error: string }> {
  try {
    const base64Pdf = pdfBuffer.toString("base64");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: `Extract the purchase order data from the attached PDF: "${fileName}". Return JSON only.`,
            },
          ],
        },
      ],
    });

    // Pull the text block out of the response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "Claude returned no text content." };
    }

    // Strip possible markdown fences that models sometimes emit
    const raw = textBlock.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(raw);

    // Validate against our schema
    const result = POExtractionSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return { success: false, error: `Validation failed: ${issues}` };
    }

    return { success: true, data: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Extraction failed: ${message}` };
  }
}
