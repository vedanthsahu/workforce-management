import { z } from "zod";

export const sanitizePhoneNumber = (value: string) => {
  if (/^(?:\d{10}|\+91 \d{10})$/.test(value)) return value;

  const cleaned = value.replace(/[^\d+ ]/g, "");
  if (cleaned.startsWith("+") && cleaned.length <= 3) return cleaned;
  if (cleaned.startsWith("+91")) {
    const digits = cleaned.slice(3).replace(/\D/g, "").slice(0, 10);
    if (!digits) return cleaned.length > 3 ? "+91 " : "+91";
    return `+91 ${digits}`;
  }
  return cleaned.replace(/\D/g, "").slice(0, 10);
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
    .refine((val) => !val || /^(?:\d{10}|\+91 \d{10})$/.test(val), {
      message: "Enter 10 digits or +91 followed by one space and 10 digits",
    })
    .optional(),
  organization: z
    .string()
    .trim()
    .refine((val) => !val || /^[a-zA-Z0-9\s]+$/.test(val), {
      message: "Organization name must not contain special characters",
    })
    .optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
