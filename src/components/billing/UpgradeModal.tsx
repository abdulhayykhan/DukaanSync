"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Zap, X, ShieldAlert, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  currentShopCount?: number;
  limit?: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan = "Trial",
  currentShopCount = 1,
  limit = 1,
}: UpgradeModalProps) {
  const router = useRouter();

  const handleGoToBilling = () => {
    onClose();
    router.push("/settings/billing");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-2xl z-[70] p-6 focus:outline-none animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900">Branch Limit Reached</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your business is currently on the <span className="font-bold text-gray-900 capitalize">{currentPlan} Plan</span> which allows up to <span className="font-bold text-gray-900">{limit} shop branch{limit > 1 ? "es" : ""}</span>.
            </p>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900 font-medium">
              You are currently using <span className="font-bold">{currentShopCount} / {limit}</span> allowed shops. Upgrade your subscription to unlock additional store locations.
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleGoToBilling} className="gap-1.5 text-xs font-bold bg-[#10B981] hover:bg-emerald-600">
              <Zap className="w-4 h-4" /> Upgrade Plan <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
