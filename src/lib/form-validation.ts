import { z } from "zod";

export function normalizeIndianMobile(value: string) {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) {
    throw new Error("Use digits and standard phone-number separators only.");
  }
  const digits = trimmed.replace(/\D/g, "");
  const nationalNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }
  return `+91${nationalNumber}`;
}

export function sanitizeIndianMobileInput(value: string) {
  return value
    .replace(/[^\d+\s().-]/g, "")
    .replace(/(?!^)\+/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 20);
}

export const indianMobileSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .transform((value, context) => {
    try {
      return normalizeIndianMobile(value);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Enter a valid mobile number.",
      });
      return z.NEVER;
    }
  });

export const bookingCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Name must be 120 characters or fewer."),
  phone: indianMobileSchema,
});

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

export const wholeRupeesSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}$/, "Enter a whole rupee amount from 0 to 999,999,999.")
  .transform(Number);

const optionalWholeRupeesSchema = z
  .string()
  .trim()
  .regex(/^\d{0,9}$/, "Enter a whole rupee amount from 0 to 999,999,999.")
  .transform((value) => (value === "" ? 0 : Number(value)));

export const positiveRupeesSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,8}$/, "Enter an amount greater than zero.")
  .transform(Number);

const nonEmptyText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const tournamentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid date.");

export const cafeteriaItemFormSchema = z.object({
  name: nonEmptyText("Item name", 120),
  note: z.string().trim().max(200, "Note must be 200 characters or fewer."),
  price: optionalWholeRupeesSchema,
});

export const tournamentFormSchema = z.object({
  title: nonEmptyText("Tournament name", 120),
  date: tournamentDateSchema,
  entryFee: optionalWholeRupeesSchema,
  prizePool: optionalWholeRupeesSchema,
});

export const ratesFormSchema = z.object({
  snooker: wholeRupeesSchema,
  pool: wholeRupeesSchema,
});

export const shopProductFormSchema = z.object({
  name: nonEmptyText("Product name", 80),
  description: nonEmptyText("Description", 500),
  category: z.enum(["CUES", "TIPS", "CHALK", "GLOVES", "CASES", "ACCESSORIES"]),
  price: positiveRupeesSchema,
  discountPercent: z
    .string()
    .trim()
    .regex(/^(?:100|[1-9]?\d)$/, "Enter a whole-number discount from 0 to 100.")
    .transform(Number),
});
