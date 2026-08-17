"use client";

import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Business, BusinessPlan } from "@/types";
import { PLAN_TIERS } from "@/lib/constants/plans";
import { toast } from "sonner";
import { format } from "date-fns";
import { Building2, Edit2, Check, X } from "lucide-react";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState<BusinessPlan>("free");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, "businesses"));
      const items: Business[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Business));
      
      // Sort by creation date descending
      items.sort((a, b) => {
        const dateA = a.createdAt ? ((a.createdAt as any).seconds ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as unknown as string).getTime()) : 0;
        const dateB = b.createdAt ? ((b.createdAt as any).seconds ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as unknown as string).getTime()) : 0;
        return dateB - dateA;
      });

      setBusinesses(items);
    } catch (error: any) {
      console.error("Failed to fetch businesses:", error);
      toast.error(error.message || "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (businessId: string) => {
    if (!newPlan || !db) return;
    try {
      setProcessing(true);
      await updateDoc(doc(db, "businesses", businessId), {
        plan: newPlan,
        updatedAt: new Date()
      });
      toast.success("Plan updated successfully!");
      setEditingId(null);
      await fetchBusinesses();
    } catch (error: any) {
      console.error("Failed to update plan:", error);
      toast.error(error.message || "Failed to update plan");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading businesses...</div>;
  }

  return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Business Name</th>
              <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Owner ID</th>
              <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Status</th>
              <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Current Plan</th>
              <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Created Date</th>
              <th className="px-6 py-4 text-right bg-slate-50 border-b border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                  No businesses found.
                </td>
              </tr>
            ) : (
              businesses.map(business => (
                <tr key={business.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {business.name}
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{business.id}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{business.ownerId}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center capitalize px-2 py-1 rounded-full text-xs font-medium ${
                      (business.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {business.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === business.id ? (
                      <select
                        value={newPlan}
                        onChange={(e) => setNewPlan(e.target.value as BusinessPlan)}
                        className="text-sm border-gray-300 rounded-md focus:ring-[#10B981] focus:border-[#10B981]"
                        disabled={processing}
                      >
                        {PLAN_TIERS.map(tier => (
                          <option key={tier.id} value={tier.id}>{tier.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center capitalize bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold tracking-wide">
                        {business.plan}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {business.createdAt ? format(new Date(((business.createdAt as any).seconds ? (business.createdAt as any).seconds * 1000 : business.createdAt) as number), "MMM d, yyyy") : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === business.id ? (
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleUpdatePlan(business.id)}
                          disabled={processing}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={processing}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(business.id);
                          setNewPlan(business.plan);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981] hover:text-emerald-700 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Change Plan
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
              </tbody>
            </table>
        </div>
      </div>
  );
}
