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
import { Lock } from "lucide-react";

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
        plan: "free",
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
    <div className="max-w-2xl mx-auto mt-8 sm:mt-12 mb-12">
      <div className="glass-card p-6 sm:p-10 rounded-2xl shadow-xl border border-white/40">
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center justify-center">
            <span className="text-3xl font-extrabold text-primary tracking-tight">DukaanSync</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Set up your business</h3>
          <p className="mt-2 text-sm text-gray-600">
            Let&apos;s create your primary business and first shop location.
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {submitError}
            </div>
          )}

          {/* Section 1: Business Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <h4 className="text-lg font-semibold text-gray-900">Business Information</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Business Name
                </label>
                <Input
                  type="text"
                  {...register("businessName")}
                  error={errors.businessName?.message}
                  placeholder="e.g. Acme Retail"
                />
              </div>
              
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Default Currency
                </label>
                <div className="mt-1 flex flex-col gap-1.5 items-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm font-medium text-gray-600">
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                    PKR
                  </div>
                  <p className="text-xs text-gray-500">Currently limited to PKR.</p>
                </div>
                {/* Keep the hidden input so the form submission still includes 'currency' if needed by zod, 
                    although defaultValues is set. */}
                <input type="hidden" {...register("currency")} value="PKR" />
              </div>
            </div>
          </div>

          {/* Section 2: Shop Location */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <h4 className="text-lg font-semibold text-gray-900">First Shop Location</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Shop Name
                </label>
                <Input
                  type="text"
                  {...register("shopName")}
                  error={errors.shopName?.message}
                  placeholder="e.g. Main Branch"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Shop Code
                </label>
                <Input
                  type="text"
                  {...register("shopCode")}
                  error={errors.shopCode?.message}
                  placeholder="e.g. MAIN"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <Input
                  type="text"
                  {...register("address")}
                  error={errors.address?.message}
                  placeholder="Shop physical address"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
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

          <div className="pt-6">
            <Button type="submit" isLoading={isSubmitting} className="w-full text-base py-6">
              Complete Setup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
