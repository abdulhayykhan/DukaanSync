"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/Button";

export default function BusinessProfilePage() {
  const { business, memberRole } = useBusiness();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
    }
  }, [business]);

  // Role Guarding: Only owners or managers can access business settings
  if (memberRole === "cashier" || memberRole === "inventory_manager") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 glass-card rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          You do not have permission to modify the business profile.
        </p>
        <Button onClick={() => router.push("/settings")} className="w-full sm:w-auto">
          Back to Settings
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !business || !name.trim()) return;

    try {
      setIsSaving(true);
      const businessRef = doc(db, "businesses", business.id);
      await updateDoc(businessRef, {
        name: name.trim(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Business profile updated successfully");
      // BusinessContext will auto-update via snapshot listener
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update business profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-4">
        <Link href="/settings" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Building2 className="w-8 h-8 text-purple-500" /> Business Profile
        </h1>
        <p className="text-lg text-gray-500 mt-2">Manage your core business settings and preferences.</p>
      </div>

      <div className="glass-card bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full" />
        
        <form onSubmit={handleSave} className="space-y-6 relative z-10">
          <div>
            <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              placeholder="e.g. Acme Supermarket"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Currency
            </label>
            <input
              type="text"
              disabled
              value={business?.currency || "PKR"}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed outline-none"
            />
            <p className="mt-1 text-sm text-gray-400">Currency is set globally and cannot be changed.</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subscription Plan
            </label>
            <div className="mt-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 capitalize">
                {business?.plan || "free"}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <Button type="submit" disabled={isSaving || !name.trim()} className="w-full sm:w-auto px-8 bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
              {isSaving ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
