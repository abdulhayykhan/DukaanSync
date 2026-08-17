"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collectionGroup, query, where, orderBy, getDocs, writeBatch, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, ShieldAlert, CreditCard } from "lucide-react";

import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import type { BillingTransaction } from "@/types";

interface PendingUpgrade extends BillingTransaction {
  businessName: string; // We'll fetch this separately
}

export default function AdminBillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingUpgrades, setPendingUpgrades] = useState<PendingUpgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Authorization Guard
  useEffect(() => {
    if (!user) return;
    const isSeedAdmin = 
      user.email === "seed.admin@metromart.com" || 
      user.uid === "QhlEJoMLs0geF2lZB8k9wokL0PJ3" ||
      (process.env.NEXT_PUBLIC_SEED_ADMIN_UIDS || "").includes(user.uid);
      
    if (!isSeedAdmin) {
      toast.error("Unauthorized access.");
      router.push("/dashboard");
    }
  }, [user, router]);

  // 2. Fetch Pending Upgrades
  const fetchPending = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const q = query(
        collectionGroup(db, "billingHistory"),
        where("status", "==", "pending_approval")
      );
      
      const snap = await getDocs(q);
      let items: PendingUpgrade[] = [];
      
      for (const d of snap.docs) {
        const data = d.data() as BillingTransaction;
        
        items.push({
          ...data,
          id: d.id,
          businessName: data.businessId, // Fallback to ID 
        });
      }

      // Sort client side
      items.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      
      setPendingUpgrades(items);
    } catch (err: any) {
      console.error("Failed to fetch pending upgrades:", err);
      toast.error(err.message || "Failed to load pending upgrades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPending();
  }, [user]);

  // 3. Approve Action
  const handleApprove = async (upgrade: PendingUpgrade) => {
    if (!db || !user) return;
    
    if (!confirm(`Approve upgrade to ${upgrade.plan} for business ${upgrade.businessId}?`)) return;

    try {
      setProcessingId(upgrade.id);
      
      const batch = writeBatch(db);
      
      // Update billing history
      const historyRef = doc(db, "businesses", upgrade.businessId, "billingHistory", upgrade.id);
      batch.update(historyRef, {
        status: "approved",
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString()
      });
      
      // Update business plan
      const bizRef = doc(db, "businesses", upgrade.businessId);
      batch.update(bizRef, {
        plan: upgrade.plan,
        updatedAt: new Date().toISOString()
      });
      
      await batch.commit();
      
      toast.success("Upgrade approved successfully!");
      setPendingUpgrades(prev => prev.filter(p => p.id !== upgrade.id));
    } catch (err: any) {
      console.error("Failed to approve:", err);
      toast.error(err.message || "Failed to approve upgrade.");
    } finally {
      setProcessingId(null);
    }
  };

  // 4. Reject Action
  const handleReject = async (upgrade: PendingUpgrade) => {
    if (!db || !user) return;
    
    const note = prompt("Reason for rejection (optional):");
    if (note === null) return; // cancelled

    try {
      setProcessingId(upgrade.id);
      
      const historyRef = doc(db, "businesses", upgrade.businessId, "billingHistory", upgrade.id);
      await updateDoc(historyRef, {
        status: "rejected",
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
        reviewNote: note || "Payment not verified."
      });
      
      toast.success("Upgrade rejected.");
      setPendingUpgrades(prev => prev.filter(p => p.id !== upgrade.id));
    } catch (err: any) {
      console.error("Failed to reject:", err);
      toast.error(err.message || "Failed to reject upgrade.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center min-h-[400px]">
        <Clock className="w-6 h-6 animate-spin mr-2" /> Loading pending upgrades...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Admin: Billing Approvals
          </h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-2xl">
            Review manual payment submissions for subscription upgrades. Verify the transaction reference with your EasyPaisa/JazzCash account before approving.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4">Business ID</th>
                <th className="px-6 py-4">Requested Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Txn Reference</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingUpgrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Check className="w-8 h-8 mx-auto text-emerald-400 mb-3" />
                    No pending upgrades to review.
                  </td>
                </tr>
              ) : (
                pendingUpgrades.map(upgrade => (
                  <tr key={upgrade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {upgrade.createdAt ? format(new Date(upgrade.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900">
                      {upgrade.businessId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize font-bold text-gray-900 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs">
                        {upgrade.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      PKR {upgrade.amountPKR.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-sm bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 w-fit">
                        <CreditCard className="w-3.5 h-3.5" />
                        {upgrade.submittedTxnRef}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        disabled={processingId === upgrade.id}
                        onClick={() => handleReject(upgrade)}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button 
                        size="sm"
                        className="bg-[#10B981] hover:bg-emerald-600 text-white"
                        disabled={processingId === upgrade.id}
                        onClick={() => handleApprove(upgrade)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
