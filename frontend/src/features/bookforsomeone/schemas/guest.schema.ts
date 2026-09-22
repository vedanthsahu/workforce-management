import { z } from "zod";
export const sanitizePhoneNumber = (value: string) => {
  return value.replace(/[^\d+ ]/g, "").replace(/(?!^)\+/g, "").replace(/\s+/g, " ").slice(0, 20);
};

// Organization is alphanumeric + spaces only -- no punctuation/special characters.
export const sanitizeOrganization = (value: string) => value.replace(/[^a-zA-Z0-9\s]/g, "");

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
    .refine((val) => !val || /^[a-zA-Z0-9\s]+$/.test(val), {
      message: "Organization name can only contain letters and numbers",
    })
    .optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
