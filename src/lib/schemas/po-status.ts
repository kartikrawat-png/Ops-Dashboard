import { z } from "zod";

export const reviewableStatuses = ["approved", "rejected", "edit_required"] as const;

export const UpdateStatusSchema = z
  .object({
    id: z.string().min(1, "PO record id is required"),
    status: z.enum(reviewableStatuses, {
      error: "Status must be approved, rejected, or edit_required",
    }),
    comments: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.status === "edit_required" &&
      (!val.comments || val.comments.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comments"],
        message: "Comments are required when status is 'edit_required'",
      });
    }
  });

export type UpdateStatusPayload = z.infer<typeof UpdateStatusSchema>;
