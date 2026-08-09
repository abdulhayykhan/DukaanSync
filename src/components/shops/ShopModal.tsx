"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { toast } from "sonner";

import { shopSchema, type ShopFormData } from "@/lib/validation/shop";
import { ShopService } from "@/lib/shops/service";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Shop } from "@/types";

interface ShopModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shopToEdit?: Shop | null;
  onSuccess: () => Promise<void>;
}

export function ShopModal({ isOpen, onOpenChange, shopToEdit, onSuccess }: ShopModalProps) {
  const { user } = useAuth();
  const { business } = useBusiness();
  const isEditing = !!shopToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopFormData>({
    resolver: zodResolver(shopSchema),
  });

  // Reset form when modal opens/closes or shopToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (shopToEdit) {
        reset({
          name: shopToEdit.name,
          code: shopToEdit.code,
          address: shopToEdit.address || "",
          phone: shopToEdit.phone || "",
        });
      } else {
        reset({ name: "", code: "", address: "", phone: "" });
      }
    }
  }, [isOpen, shopToEdit, reset]);

  const onSubmit = async (data: ShopFormData) => {
    if (!business || !user) return;

    try {
      if (isEditing && shopToEdit) {
        await ShopService.updateShop(business.id, shopToEdit.id, data);
        toast.success("Shop updated successfully");
      } else {
        await ShopService.createShop(business.id, user.uid, data);
        toast.success("Shop created successfully");
      }
      await onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      toast.error(msg);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in" />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-xl shadow-xl z-50 p-6 focus:outline-none animate-in zoom-in-95 duration-200"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-bold text-gray-900">
              {isEditing ? "Edit Shop" : "Add New Shop"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#10B981] rounded-full p-1 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("name")}
                error={errors.name?.message}
                placeholder="e.g. Downtown Branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Code <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("code")}
                error={errors.code?.message}
                placeholder="e.g. DT-01"
                disabled={isEditing} // Prevent changing code after creation
                className={isEditing ? "bg-gray-100" : ""}
              />
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be unique, uppercase letters, numbers, or dashes only.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <Input
                {...register("address")}
                error={errors.address?.message}
                placeholder="123 Main St, City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                {...register("phone")}
                error={errors.phone?.message}
                placeholder="+92 300 1234567"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="w-auto">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" isLoading={isSubmitting} className="w-auto">
                {isEditing ? "Save Changes" : "Create Shop"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
