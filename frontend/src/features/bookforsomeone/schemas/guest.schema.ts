import { z } from "zod";
export const sanitizePhoneNumber = (value: string) => {
  return value.replace(/[^\d+ ]/g, "").replace(/(?!^)\+/g, "").replace(/\s+/g, " ").slice(0, 20);
};

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
    .refine((val) => !val || /^\+\d{1,3} \d{10}$/.test(val), {
      message: "Enter exactly 10 digits after the country code",
    })
    .optional(),
  organization: z
    .string()
    .trim()
    .refine((val) => !val || /^[a-zA-Z0-9\s.,&'-]+$/.test(val), {
      message: "Organization name must not contain special characters",
    })
    // An org name that's entirely digits (e.g. someone fat-fingering a phone
    // number into the wrong field) isn't a real organization — require at
    // least one letter so a pure-number value gets caught here instead of
    // silently saved.
    .refine((val) => !val || /[a-zA-Z]/.test(val), {
      message: "Organization name must contain letters, not just numbers",
    })
    .optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
