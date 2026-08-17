"use client";

import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { UserProfile } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsersAction } from "./actions";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const res = await getAllUsersAction(user.uid);
      if (res.success && res.users) {
        // Sort by creation date descending
        const items = res.users.sort((a, b) => {
          const dateA = new Date(a.createdAt as string).getTime();
          const dateB = new Date(b.createdAt as string).getTime();
          return dateB - dateA;
        });
        setUsers(items);
      }
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">User Name</th>
                  <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Email Address</th>
                  <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">User ID (UID)</th>
                  <th className="px-6 py-4 bg-slate-50 border-b border-gray-200">Joined Date</th>
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
    </div>
  );
}
