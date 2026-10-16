import { z } from "zod";

export const claimSchema = z.object({
  itemId: z
    .string()
    .min(1, "Select an item.")
    .refine((value) => /^[a-f\d]{24}$/i.test(value), "Select a valid item."),

  proof: z.string().min(5, "Provide proof for your claim."),
});

export type ClaimFormValues = z.infer<typeof claimSchema>;
