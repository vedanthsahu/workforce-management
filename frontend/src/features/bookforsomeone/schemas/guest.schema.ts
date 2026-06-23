import { z } from "zod";

export const createGuestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || /^\+?[\d\s\-()]{10}$/.test(val), {
      message: "Enter a valid phone number",
    })
    .optional(),
  organization: z.string().trim().optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
