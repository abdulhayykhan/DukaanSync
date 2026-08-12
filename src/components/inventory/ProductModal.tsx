"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { inventoryFormSchema, transformToServicePayload, type InventoryFormData } from "@/lib/validation/inventory";
import { InventoryService } from "@/lib/inventory/service";
import { fromMinorUnit } from "@/lib/utils/currency";
import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { InventoryItem } from "@/types";

interface ProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSuccess: () => Promise<void>;
}

// Hardcoded categories as discussed
const CATEGORIES = [
  { id: "cat_electronics", name: "Electronics" },
  { id: "cat_clothing", name: "Clothing & Apparel" },
  { id: "cat_groceries", name: "Groceries" },
  { id: "cat_cosmetics", name: "Health & Beauty" },
  { id: "cat_general", name: "General Merchandise" },
];

export function ProductModal({ isOpen, onOpenChange, itemToEdit, onSuccess }: ProductModalProps) {
  const { business } = useBusiness();
  const { activeShop } = useShop();
  const isEditing = !!itemToEdit;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inventoryFormSchema) as any,
  });

  // Populate form for editing, converting minor units back to decimals
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        reset({
          sku: itemToEdit.sku,
          name: itemToEdit.name,
          categoryId: itemToEdit.categoryId,
          unit: itemToEdit.unit,
          quantity: itemToEdit.quantity,
          reorderLevel: itemToEdit.reorderLevel,
          storageLocation: itemToEdit.storageLocation || "",
          costPriceDecimal: fromMinorUnit(itemToEdit.costPriceMinor),
          retailPriceDecimal: fromMinorUnit(itemToEdit.retailPriceMinor),
        });
      } else {
        reset({
          sku: "",
          name: "",
          categoryId: "cat_general",
          unit: "pcs",
          quantity: 0,
          reorderLevel: 5,
          storageLocation: "",
          costPriceDecimal: 0,
          retailPriceDecimal: 0,
        });
      }
    }
  }, [isOpen, itemToEdit, reset]);

  const onSubmit = async (data: InventoryFormData) => {
    if (!business || !activeShop) return;

    try {
      const payload = transformToServicePayload(data);

      if (isEditing && itemToEdit) {
        await InventoryService.updateInventoryItem(business.id, activeShop.id, itemToEdit.id, payload);
        toast.success("Product updated successfully");
      } else {
        await InventoryService.createInventoryItem(business.id, activeShop.id, payload);
        toast.success("Product added to catalog");
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
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl bg-white rounded-xl shadow-xl z-50 p-6 focus:outline-none animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {isEditing ? "Edit Product" : "Add New Product"}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    SKU / Barcode
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const randomSku = `PRD-${Math.floor(100000 + Math.random() * 900000)}`;
                        setValue("sku", randomSku);
                        toast.info(`Auto-generated SKU: ${randomSku}`);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Auto-Generate SKU
                    </button>
                  )}
                </div>
                <Input
                  {...register("sku")}
                  error={errors.sku?.message}
                  placeholder="e.g. PRD-001 (or auto-generated)"
                  disabled={isEditing}
                  className={isEditing ? "bg-gray-100" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("name")}
                  error={errors.name?.message}
                  placeholder="e.g. Wireless Mouse"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  {...register("categoryId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measurement
                </label>
                <select
                  {...register("unit")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="liter">Liter (L)</option>
                  <option value="other">Other</option>
                </select>
                {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Location (Shelf / Room)
              </label>
              <Input
                {...register("storageLocation")}
                error={errors.storageLocation?.message}
                placeholder="e.g. Shelf A-3, Room 2, Top Rack"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price ({business?.currency || 'PKR'})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("costPriceDecimal")}
                  error={errors.costPriceDecimal?.message}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retail Price ({business?.currency || 'PKR'}) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("retailPriceDecimal")}
                  error={errors.retailPriceDecimal?.message}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("quantity")}
                  error={errors.quantity?.message}
                  placeholder="0"
                  disabled={isEditing} // Stock should only be updated via movements after creation
                  className={isEditing ? "bg-gray-100" : ""}
                />
                {isEditing && (
                  <p className="mt-1 text-xs text-gray-500">
                    Update stock levels via Adjustments or Purchases.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Level (Low Stock Alert)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("reorderLevel")}
                  error={errors.reorderLevel?.message}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="w-auto">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" isLoading={isSubmitting} className="w-auto">
                {isEditing ? "Save Changes" : "Add Product"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
