import { z } from "zod";

export const claimSchema = z.object({
  itemId: z
    .string()
    .min(1, "Enter an item ID.")
    .refine((value) => /^[1-9]\d*$/.test(value), "Enter a valid item ID."),

  proof: z.string().min(5, "Provide proof for your claim."),
});

export type ClaimFormValues = z.infer<typeof claimSchema>;
