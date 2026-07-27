// import { z } from "zod";

// export const createGuestSchema = z.object({
//   firstName: z.string().trim().min(1, "First name is required"),
//   lastName: z.string().trim().min(1, "Last name is required"),
//   email: z
//     .string()
//     .trim()
//     .min(1, "Email is required")
//     .email("Enter a valid email address"),
//   phone: z
//     .string()
//     .trim()
//     .refine((val) => !val || /^\+?[\d\s\-()]{10}$/.test(val), {
//       message: "Enter a valid phone number",
//     })
//     .optional(),
//   organization: z.string().trim().optional(),
// });

// export type CreateGuestFormValues = z.infer<typeof createGuestSchema>;

import { z } from "zod";

export const createGuestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  // phone: z
  //   .string()
  //   .trim()
  //   .refine((val) => !val || /^\+?[\d\s\-()]{1,10}$/.test(val), {
  //     message: "Phone number must not exceed 10 digits",
  //   })
  //   .optional(),
  phone: z
  .string()
  .trim()
  .refine((val) => !val || /^[\d\s+\-()]*$/.test(val), {
    message: "Only digits, spaces, +, -, (, ) are allowed",
  })
  .refine((val) => {
    if (!val) return true;
    const digits = val.replace(/\D/g, "");
    if (digits.startsWith("91")) return digits.length === 12;
    return digits.length === 10;
  }, {
    message: "Phone number must be exactly 10 digits (or 91 + 10 digits)",
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