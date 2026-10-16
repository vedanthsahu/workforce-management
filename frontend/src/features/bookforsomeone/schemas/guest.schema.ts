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

// Guest emails must come from one of these providers. Keep in sync with
// ALLOWED_GUEST_EMAIL_DOMAINS in backend/schemas/guest.py.
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "zoho.com",
] as const;

export const EMAIL_DOMAIN_ERROR =
  "This email domain isn't supported. Please use a different email address.";

const hasAllowedEmailDomain = (email: string) =>
  (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(
    email.slice(email.lastIndexOf("@") + 1).toLowerCase(),
  );

// Length limits for the first and last name fields (each, after trimming).
// The minimum applies to the first name only -- a last name can be a single
// letter (e.g. "Ravi K").
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;

export const createGuestSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .min(NAME_MIN_LENGTH, `First name must be at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `First name must be ${NAME_MAX_LENGTH} characters or fewer`),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(NAME_MAX_LENGTH, `Last name must be ${NAME_MAX_LENGTH} characters or fewer`),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .refine(hasAllowedEmailDomain, { message: EMAIL_DOMAIN_ERROR }),
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
