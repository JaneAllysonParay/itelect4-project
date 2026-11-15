import { z } from "zod";

const eventTimeSchema = z.string();

const categorySchema = z.union([
  z.literal(""),
  z.literal("electronics"),
  z.literal("clothing"),
  z.literal("bags"),
  z.literal("keys"),
  z.literal("documents"),
  z.literal("accessories"),
  z.literal("other"),
]);

export const itemSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(100, "Title cannot exceed 100 characters."),
    description: z.string().trim().min(5, "Description must be at least 5 characters.").max(1000, "Description cannot exceed 1000 characters."),
    location: z.string().trim().min(2, "Enter the campus location.").max(200, "Location cannot exceed 200 characters."),
    reportType: z.enum(["lost", "found"]),
    eventAt: eventTimeSchema,
    category: categorySchema.optional(),
    custodyStatus: z
      .union([z.literal(""), z.enum(["finder_reported", "security_reported"])])
      .optional()
      .transform((value) => value || undefined),
    isExistingReport: z.boolean().optional(),
  })
  .superRefine((values, context) => {
    if (!values.isExistingReport && !values.eventAt) {
      context.addIssue({ code: "custom", path: ["eventAt"], message: "Enter when the item was last seen or found." });
    } else if (values.eventAt && Number.isNaN(new Date(values.eventAt).getTime())) {
      context.addIssue({ code: "custom", path: ["eventAt"], message: "Enter a valid date and time." });
    } else if (values.eventAt && new Date(values.eventAt).getTime() > Date.now()) {
      context.addIssue({ code: "custom", path: ["eventAt"], message: "Date and time cannot be in the future." });
    }
    if (values.reportType === "found" && !values.custodyStatus && !values.isExistingReport) {
      context.addIssue({
        code: "custom",
        path: ["custodyStatus"],
        message: "Select the current custody information.",
      });
    }
  });

export type ItemFormInput = z.input<typeof itemSchema>;
export type ItemFormValues = z.output<typeof itemSchema>;
