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
    .refine((val) => !val || /^[a-zA-Z\s.,&'-]+$/.test(val), {
      message: "Organization name must not contain special characters",
    })
    .refine((val) => !val || !/\d/.test(val), {
      message: "Organization name must not contain numbers",
    })
    .optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
