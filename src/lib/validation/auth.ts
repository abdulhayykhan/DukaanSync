import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const onboardingSchema = z.object({
  businessName: z.string().min(2, { message: "Business name is required" }),
  shopName: z.string().min(2, { message: "Shop name is required" }),
  shopCode: z.string().min(2, { message: "Shop code is required (e.g., MAIN)" }),
  address: z.string().min(5, { message: "Address is required" }),
  phone: z.string().min(10, { message: "Valid phone number is required" }),
  currency: z.literal("PKR"),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
