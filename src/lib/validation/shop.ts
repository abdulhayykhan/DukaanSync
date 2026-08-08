import { z } from "zod";

export const shopSchema = z.object({
  name: z.string().min(2, { message: "Shop name must be at least 2 characters" }),
  code: z
    .string()
    .min(2, { message: "Shop code is required" })
    .max(10, { message: "Shop code must be 10 characters or less" })
    .regex(/^[A-Z0-9-]+$/, {
      message: "Shop code must contain only uppercase letters, numbers, and dashes",
    }),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type ShopFormData = z.infer<typeof shopSchema>;
