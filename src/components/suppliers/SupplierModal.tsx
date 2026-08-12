"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";

import { SupplierService } from "@/lib/suppliers/service";
import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Supplier } from "@/types";

const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supplierToEdit?: Supplier | null;
  onSuccess: () => Promise<void>;
}

export function SupplierModal({ isOpen, onOpenChange, supplierToEdit, onSuccess }: SupplierModalProps) {
  const { business } = useBusiness();
  const { activeShop } = useShop();
  const isEditing = !!supplierToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        reset({
          name: supplierToEdit.name,
          phone: supplierToEdit.phone || "",
          email: supplierToEdit.email || "",
          city: supplierToEdit.city || supplierToEdit.location || "",
          location: supplierToEdit.location || supplierToEdit.city || "",
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          city: "",
          location: "",
        });
      }
    }
  }, [isOpen, supplierToEdit, reset]);

  const onSubmit = async (data: SupplierFormData) => {
    if (!business || !activeShop) return;

    try {
      const payload = {
        ...data,
        city: data.city || data.location || "",
        location: data.location || data.city || "",
      };
      if (isEditing && supplierToEdit) {
        await SupplierService.updateSupplier(business.id, activeShop.id, supplierToEdit.id, payload);
        toast.success("Supplier updated successfully");
      } else {
        await SupplierService.createSupplier(business.id, activeShop.id, payload);
        toast.success("Supplier created successfully");
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
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {isEditing ? "Edit Supplier" : "Add Supplier"}
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
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("name")}
                error={errors.name?.message}
                placeholder="e.g. Acme Wholesale"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City / Region <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                {...register("city")}
                error={errors.city?.message}
                placeholder="e.g. Lahore, Karachi, Clifton Branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                {...register("phone")}
                error={errors.phone?.message}
                placeholder="e.g. +92 300 1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City / Location <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                {...register("location")}
                error={errors.location?.message}
                placeholder="e.g. Lahore, Clifton Branch, Shah Alam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="email"
                {...register("email")}
                error={errors.email?.message}
                placeholder="e.g. contact@acme.com"
              />
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="w-auto">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" isLoading={isSubmitting} className="w-auto">
                {isEditing ? "Save Changes" : "Create Supplier"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
