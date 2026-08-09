"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { resetPassword, error: authError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword(data.email);
      setIsSuccess(true);
    } catch {
      // Error handled by context
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
        <p className="text-sm text-gray-600">
          We&apos;ve sent password reset instructions to your email address.
        </p>
        <div className="mt-6">
          <Link href="/login" className="font-medium text-[#10B981] hover:text-[#059669]">
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Reset your password</h3>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {authError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            {authError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <Input
            type="email"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <Button type="submit" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center font-medium text-[#10B981] hover:text-[#059669]">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
