"use client";

import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { UserProfile } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users as UsersIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { repairUsersAction } from "./actions";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, "users"));
      const items: UserProfile[] = [];
      snap.forEach((d) => items.push({ uid: d.id, ...d.data() } as UserProfile));
      
      // Sort by creation date descending
      items.sort((a, b) => {
        const dateA = a.createdAt ? ((a.createdAt as any).seconds ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as string).getTime()) : 0;
        const dateB = b.createdAt ? ((b.createdAt as any).seconds ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as string).getTime()) : 0;
        return dateB - dateA;
      });

      setUsers(items);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading users...</div>;
  }

  const handleSyncData = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await repairUsersAction(user.uid);
      if (res.success) {
        toast.success(`Successfully synchronized ${res.count} user(s).`);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync user data");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={handleSyncData} 
          disabled={syncing}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing Data...' : 'Sync Missing User Data'}
        </Button>
      </div>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="overflow-x-auto pb-4">
          <table className="w-full min-w-max text-sm text-left">
          <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4">User Name</th>
              <th className="px-6 py-4">Email Address</th>
              <th className="px-6 py-4">User ID (UID)</th>
              <th className="px-6 py-4">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <UsersIcon className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {u.displayName || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                    {u.uid}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {u.createdAt ? format(new Date(((u.createdAt as any).seconds ? (u.createdAt as any).seconds * 1000 : u.createdAt) as number), "MMM d, yyyy") : "N/A"}
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
