"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Users, Building2, Crown, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    premiumBusinesses: 0,
    activeBusinesses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!db) return;
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const bizSnap = await getDocs(collection(db, "businesses"));

        let premium = 0;
        let active = 0;

        bizSnap.forEach((doc) => {
          const data = doc.data();
          if (data.plan === "pro" || data.plan === "elite") premium++;
          if (data.status === "active") active++;
        });

        setStats({
          totalUsers: usersSnap.size,
          totalBusinesses: bizSnap.size,
          premiumBusinesses: premium,
          activeBusinesses: active,
        });
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total Businesses",
      value: stats.totalBusinesses,
      icon: Building2,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Premium Subscribers",
      value: stats.premiumBusinesses,
      icon: Crown,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Active Tenants",
      value: stats.activeBusinesses,
      icon: Activity,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Platform Overview</h2>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
