import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "At least 8 characters."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your name."),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
