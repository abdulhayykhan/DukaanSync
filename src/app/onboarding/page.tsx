"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, writeBatch, collection } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { onboardingSchema, type OnboardingFormData } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { refreshBusiness } = useBusiness();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      currency: "PKR",
    },
  });

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user || !db) return;
    setSubmitError(null);

    try {
      const businessRef = doc(collection(db, "businesses"));
      const businessId = businessRef.id;

      const shopRef = doc(collection(db, "businesses", businessId, "shops"));
      const shopId = shopRef.id;

      const userRef = doc(db, "users", user.uid);
      const memberRef = doc(db, "businesses", businessId, "members", user.uid);

      const batch = writeBatch(db);

      batch.set(businessRef, {
        name: data.businessName,
        ownerId: user.uid,
        currency: data.currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      batch.set(shopRef, {
        name: data.shopName,
        code: data.shopCode,
        address: data.address,
        phone: data.phone,
        isMain: true,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      batch.set(memberRef, {
        role: "owner",
        shopIds: [shopId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      batch.set(
        userRef,
        {
          businessId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await batch.commit();
      await refreshProfile();
      await refreshBusiness();
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Onboarding setup failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to set up your business. Please try again.";
      setSubmitError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">Set up your business</h3>
        <p className="mt-2 text-sm text-gray-600">
          Let&apos;s create your primary business and first shop location.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            {submitError}
          </div>
        )}

        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Business Information</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <Input
                type="text"
                {...register("businessName")}
                error={errors.businessName?.message}
                placeholder="e.g. Acme Retail"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Currency
              </label>
              <Input
                type="text"
                {...register("currency")}
                disabled
                className="bg-gray-50 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">Currently limited to PKR.</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">First Shop Location</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name
              </label>
              <Input
                type="text"
                {...register("shopName")}
                error={errors.shopName?.message}
                placeholder="e.g. Main Branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Code
              </label>
              <Input
                type="text"
                {...register("shopCode")}
                error={errors.shopCode?.message}
                placeholder="e.g. MAIN"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <Input
                type="text"
                {...register("address")}
                error={errors.address?.message}
                placeholder="Shop physical address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                {...register("phone")}
                error={errors.phone?.message}
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Complete Setup
          </Button>
        </div>
      </form>
    </div>
  );
}
