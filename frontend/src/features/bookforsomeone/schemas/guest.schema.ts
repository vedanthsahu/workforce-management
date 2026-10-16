import { z } from "zod";

import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js/mobile";

export const sanitizePhoneNumber = (value: string) => {
  return value.replace(/[^\d+ ]/g, "").replace(/(?!^)\+/g, "").replace(/\s+/g, " ").slice(0, 24);
};

export const normalizeMobileNumber = (value: string) => {
  const compact = value.replace(/\s/g, "");
  if (!compact || !isValidPhoneNumber(compact)) return null;

  const parsed = parsePhoneNumber(compact);
  const numberType = parsed.getType();
  if (numberType !== "MOBILE" && numberType !== "FIXED_LINE_OR_MOBILE") return null;

  return parsed.number;
};

// Local part: letters/digits/._%+- with no leading, trailing or consecutive dots.
// Domain: dot-separated labels (no leading/trailing hyphen) ending in an alphabetic TLD of 2+ letters.
const EMAIL_PATTERN =
  /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export const isValidEmail = (value: string) => value.length <= 254 && EMAIL_PATTERN.test(value);

export const createGuestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine(isValidEmail, "Enter a valid email address (e.g. name@example.com)"),
  phone: z
    .string()
    .refine((val) => !val || normalizeMobileNumber(val) !== null, {
      message: "Enter a valid mobile number for the selected country",
    })
    .transform((val) => (val ? normalizeMobileNumber(val) ?? val : val))
    .optional(),
  organization: z.string().trim().optional(),
});

export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;
