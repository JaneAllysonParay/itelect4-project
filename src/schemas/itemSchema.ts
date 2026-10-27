import { z } from "zod";

export const itemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(100, "Title cannot exceed 100 characters."),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters.")
    .max(1000, "Description cannot exceed 1000 characters."),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters.")
    .max(200, "Location cannot exceed 200 characters."),
  status: z.enum(["lost", "found", "claimed"]),
});

export type ItemFormValues = z.infer<typeof itemSchema>;
