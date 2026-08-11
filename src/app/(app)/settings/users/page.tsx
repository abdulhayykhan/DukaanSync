"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, ShieldAlert, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/Button";
import { UserService, type BusinessMember } from "@/lib/users/service";

export default function UsersSettingsPage() {
  const { business, memberRole } = useBusiness();
  const router = useRouter();
  
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setError(null);
    try {
      const membersData = await UserService.getTeamMembers(business.id);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err: any) {
      console.error("Failed to fetch members:", err?.message || err);
      setError("Unable to load team members right now.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (memberRole === "owner" || memberRole === "manager") {
      fetchMembers();
    }
  }, [memberRole, fetchMembers]);

  // Role Guarding: Only owners or managers can access user settings
  if (memberRole === "cashier" || memberRole === "inventory_manager") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 glass-card rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          You do not have permission to view or manage team members.
        </p>
        <Button onClick={() => router.push("/settings")} className="w-full sm:w-auto">
          Back to Settings
        </Button>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800 border-purple-200",
    manager: "bg-blue-100 text-blue-800 border-blue-200",
    cashier: "bg-green-100 text-green-800 border-green-200",
    inventory_manager: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-4">
        <Link href="/settings" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-500" /> Team Members
          </h1>
          <p className="text-lg text-gray-500 mt-2">Manage user access and roles for your business.</p>
        </div>
        <Button onClick={() => toast.info("User invitation feature coming soon!")} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-emerald-600 hover:bg-emerald-700">
          <Mail className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMembers} className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="glass-card bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Loading team members...
                  </td>
                </tr>
              ) : (
                safeMembers.map((member) => {
                  const displayEmail = member.email || "Team Member";
                  const avatarInitial = (displayEmail || member.uid || "U").charAt(0).toUpperCase();

                  return (
                    <tr key={member.uid} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold shadow-sm">
                            {avatarInitial}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{displayEmail}</span>
                            <span className="text-xs text-gray-400 font-mono">{member.uid}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleColors[member.role] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                          {(member.role || "cashier").replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" className="px-3 py-1.5 text-xs h-auto" onClick={() => toast.info("Role editing coming soon!")}>
                          Edit Role
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && safeMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
