"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, CheckCircle2, XCircle, MoreVertical, Star, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { useBusiness } from "@/contexts/BusinessContext";
import { useShop } from "@/contexts/ShopContext";
import { ShopService } from "@/lib/shops/service";
import { ShopModal } from "@/components/shops/ShopModal";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Button } from "@/components/ui/Button";
import type { Shop } from "@/types";

const PLAN_MAX_SHOPS: Record<string, number> = {
  free: 1,
  basic: 2,
  pro: 999,
};

export default function ShopsSettingsPage() {
  const router = useRouter();
  const { business, memberRole } = useBusiness();
  const { activeShopId, refreshShops } = useShop();

  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const currentPlan = business?.plan || "free";
  const maxAllowedShops = PLAN_MAX_SHOPS[currentPlan] || 1;
  const isLimitReached = allShops.length >= maxAllowedShops;

  const fetchAllShops = useCallback(async () => {
    if (!db || !business) return;
    setLoading(true);
    try {
      const shopsRef = collection(db, "businesses", business.id, "shops");
      const snapshot = await getDocs(shopsRef);
      const shopsData: Shop[] = [];
      snapshot.forEach(doc => {
        shopsData.push({ id: doc.id, ...doc.data() } as Shop);
      });
      setAllShops(shopsData);
    } catch (err: any) {
      console.error("Failed to fetch shops:", err?.message || err);
      // Fallback empty list gracefully if error occurs
      setAllShops([]);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (memberRole && memberRole !== "cashier") {
      fetchAllShops();
    }
  }, [memberRole, fetchAllShops]);

  // 1. Role Guarding: Block access for cashiers
  if (memberRole === "cashier") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">
          You do not have permission to view or manage shop configurations.
        </p>
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  // 2. Handlers
  const handleOpenCreateModal = () => {
    if (isLimitReached) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setShopToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shop: Shop) => {
    setShopToEdit(shop);
    setIsModalOpen(true);
  };

  const handleSuccess = async () => {
    await fetchAllShops();
    await refreshShops(); // Refresh the context so the header switcher updates
  };

  const handleToggleStatus = async (shop: Shop) => {
    if (!business) return;
    
    // Prevent deactivating main shop
    if (shop.isMain && shop.status === "active") {
      toast.error("Cannot deactivate the main branch. Set another branch as main first.");
      return;
    }

    const actionText = shop.status === "active" ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionText} ${shop.name}?`)) return;

    try {
      setIsProcessing(shop.id);
      await ShopService.toggleShopStatus(business.id, shop.id, shop.status, shop.isMain);
      await handleSuccess();
      toast.success(`Shop ${actionText}d successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update shop status");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSetMainShop = async (shop: Shop) => {
    if (!business) return;
    if (shop.isMain) return;
    
    if (!confirm(`Make ${shop.name} the new main branch?`)) return;

    try {
      setIsProcessing(shop.id);
      await ShopService.setMainShop(business.id, shop.id);
      await handleSuccess();
      toast.success(`${shop.name} is now the main branch`);
    } catch (err: any) {
      toast.error(err.message || "Failed to set main shop");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-4">
        <Link href="/settings" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
      </div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shops & Branches</h1>
          <p className="text-lg text-gray-500 mt-2">Manage physical locations for your business.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <Plus className="mr-2 h-4 w-4" /> Add New Shop
        </Button>
      </div>

      {/* Shop List */}
      <div className="glass-card bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Shop Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Main Branch</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading shops...
                  </td>
                </tr>
              ) : allShops.map((shop) => (
                <tr 
                  key={shop.id} 
                  className={`hover:bg-gray-50 transition-colors ${activeShopId === shop.id ? 'bg-green-50/30' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        {shop.name}
                        {activeShopId === shop.id && (
                          <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" title="Currently active in dashboard"></span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">{shop.address || 'No address provided'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium font-mono">
                      {shop.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {shop.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {shop.isMain ? (
                      <span className="inline-flex items-center gap-1 text-[#3B82F6] text-sm font-semibold">
                        <Star className="w-4 h-4 fill-current" /> Main
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button 
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          disabled={isProcessing === shop.id}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" className="min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95">
                          <DropdownMenu.Item
                            onClick={() => handleOpenEditModal(shop)}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 cursor-default outline-none"
                          >
                            Edit Details
                          </DropdownMenu.Item>
                          
                          <DropdownMenu.Item
                            onClick={() => handleSetMainShop(shop)}
                            disabled={shop.isMain || shop.status !== 'active'}
                            className={`px-4 py-2 text-sm outline-none cursor-default ${
                              shop.isMain || shop.status !== 'active'
                                ? 'text-gray-300 pointer-events-none' 
                                : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'
                            }`}
                          >
                            Set as Main Shop
                          </DropdownMenu.Item>

                          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

                          <DropdownMenu.Item
                            onClick={() => handleToggleStatus(shop)}
                            disabled={shop.isMain && shop.status === 'active'}
                            className={`px-4 py-2 text-sm outline-none cursor-default ${
                              shop.isMain && shop.status === 'active'
                                ? 'text-gray-300 pointer-events-none'
                                : shop.status === 'active' 
                                  ? 'text-red-600 hover:bg-red-50 focus:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50 focus:bg-green-50'
                            }`}
                          >
                            {shop.status === 'active' ? 'Deactivate Shop' : 'Activate Shop'}
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              ))}
              
              {!loading && allShops.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No shops found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ShopModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        shopToEdit={shopToEdit}
        onSuccess={handleSuccess}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={currentPlan}
        currentShopCount={allShops.length}
        limit={maxAllowedShops}
      />
    </div>
  );
}
