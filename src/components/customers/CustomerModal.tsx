"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { CustomerService } from "@/lib/customers/service";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Customer } from "@/types";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer?: Customer) => void;
  customer?: Customer;
}

export function CustomerModal({ isOpen, onClose, onSuccess, customer }: CustomerModalProps) {
  const { business } = useBusiness();
  const { activeShop } = useShop();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    type: "retailer" as "wholesaler" | "retailer",
  });

  useEffect(() => {
    if (isOpen && customer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        location: customer.location || "",
        type: customer.type || "retailer",
      });
    } else if (isOpen) {
       
      setFormData({ name: "", phone: "", email: "", location: "", type: "retailer" });
    }
  }, [isOpen, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !activeShop) return;

    try {
      setIsSubmitting(true);
      if (customer) {
        await CustomerService.updateCustomer(business.id, activeShop.id, customer.id, formData);
        toast.success("Customer updated successfully");
        onSuccess();
      } else {
        const newId = await CustomerService.createCustomer(business.id, activeShop.id, formData);
        toast.success("Customer added successfully");
        const now = new Date().toISOString();
        const createdCustomer: Customer = {
          id: newId,
          name: formData.name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          location: formData.location || undefined,
          type: formData.type,
          currentBalanceMinor: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        onSuccess(createdCustomer);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save customer";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md glass-card border border-white/20 rounded-xl shadow-xl z-[70] p-6 focus:outline-none animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {customer ? "Edit Customer" : "Add New Customer"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Ahmed Furnishings"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                value={formData.type}
                onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))}
              >
                <option value="retailer">Retailer (Standard Pricing)</option>
                <option value="wholesaler">Wholesaler (Custom / Bulk Pricing)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="e.g. +923001234567"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City / Location <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="e.g. Lahore, Saddar Market"
                value={formData.location}
                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="email"
                placeholder="e.g. ali@example.com"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>
                {customer ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
