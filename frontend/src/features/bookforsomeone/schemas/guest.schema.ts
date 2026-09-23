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
    .refine((val) => !val || normalizeMobileNumber(val) !== null, {
      message: "Enter a valid mobile number for the selected country",
    })
    .transform((val) => (val ? normalizeMobileNumber(val) ?? val : val))
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
