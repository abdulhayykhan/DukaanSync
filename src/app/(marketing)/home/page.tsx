"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
  ArrowRight, 
  Store, 
  Check, 
  BarChart3, 
  Users, 
  Package,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Laptop
} from "lucide-react";
import { PLAN_TIERS } from "@/lib/constants/plans";

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (custom = 0) => ({
    opacity: 1, 
    y: 0, 
    transition: { delay: custom * 0.1, duration: 0.6 } as any
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

export default function MarketingHomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Parallax elements for hero
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacityHero = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  
  // 3D Card tilt effect values (simulated via scroll for the demo image)
  const rotateX = useTransform(scrollYProgress, [0, 1], [15, 0]);
  const translateZ = useTransform(scrollYProgress, [0, 1], [50, 0]);

  return (
    <div className="overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section 
        ref={heroRef}
        className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden perspective-1000"
      >
        {/* Background blobs */}
        <motion.div 
          style={{ y: yBg }}
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-gray-50 to-white"
        />
        <div className="absolute top-1/4 right-0 -z-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            style={{ opacity: opacityHero, scale: scaleHero }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div 
              custom={0} initial="hidden" animate="visible" variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-600 text-xs font-semibold tracking-wide uppercase mb-6"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Built for Pakistani Retail
            </motion.div>
            
            <motion.h1 
              custom={1} initial="hidden" animate="visible" variants={fadeUp}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight"
            >
              One business. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#059669]">
                Multiple shops.
              </span>
            </motion.h1>
            
            <motion.p 
              custom={2} initial="hidden" animate="visible" variants={fadeUp}
              className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              A multi-tenant retail management & POS SaaS platform with strict data isolation. Track inventory, manage customer credit, and view financial reports across all your branches securely.
            </motion.p>
            
            <motion.div 
              custom={3} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/login" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-medium text-lg shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>

          {/* 3D Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 100, rotateX: 25 }}
            animate={{ opacity: 1, y: 0, rotateX: 15 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            style={{ rotateX, translateZ, transformStyle: "preserve-3d" }}
            className="mt-20 mx-auto max-w-5xl relative perspective-1000"
          >
            <div className="relative rounded-2xl border border-gray-200/60 bg-white/50 backdrop-blur-sm shadow-2xl shadow-emerald-900/10 p-2 overflow-hidden ring-1 ring-black/5">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-white/10 pointer-events-none" />
              <div className="aspect-[16/9] w-full rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200/50">
                {/* Abstract representation of the dashboard */}
                <div className="w-full h-full bg-white flex flex-col">
                  {/* Top nav abstract */}
                  <div className="h-12 border-b border-gray-100 flex items-center px-4 gap-4">
                    <div className="w-8 h-8 rounded bg-emerald-100" />
                    <div className="w-24 h-4 rounded bg-gray-100" />
                    <div className="ml-auto w-8 h-8 rounded-full bg-gray-100" />
                  </div>
                  <div className="flex flex-1">
                    {/* Sidebar abstract */}
                    <div className="w-48 border-r border-gray-100 p-4 space-y-3 hidden sm:block">
                      <div className="w-full h-6 rounded bg-emerald-50 border border-emerald-100" />
                      <div className="w-3/4 h-6 rounded bg-gray-50" />
                      <div className="w-5/6 h-6 rounded bg-gray-50" />
                    </div>
                    {/* Main content abstract */}
                    <div className="flex-1 p-6 space-y-6">
                      <div className="w-48 h-8 rounded bg-gray-100" />
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-24 rounded-xl border border-gray-100 bg-white shadow-sm" />
                        <div className="h-24 rounded-xl border border-gray-100 bg-white shadow-sm" />
                        <div className="h-24 rounded-xl border border-gray-100 bg-white shadow-sm" />
                      </div>
                      <div className="h-64 rounded-xl border border-gray-100 bg-gray-50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Everything you need to run your retail empire
            </h2>
            <p className="text-lg text-gray-600">
              DukaanSync brings enterprise-level multi-branch management to small and medium businesses.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <FeatureCard 
              icon={<Laptop className="w-6 h-6 text-emerald-600" />}
              title="Modern POS & Checkout"
              description="Fast, reliable point-of-sale terminal. Process sales quickly with guest checkout or assign to specific customers."
            />
            <FeatureCard 
              icon={<Store className="w-6 h-6 text-emerald-600" />}
              title="Multi-Shop Inventory"
              description="Track stock across all your branches. Transfer items between shops and maintain strict isolated stock counts."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-emerald-600" />}
              title="Customer & Supplier Ledgers"
              description="Built-in credit tracking (udhaar). Keep detailed ledgers for every customer and supplier with transaction history."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-emerald-600" />}
              title="Financial Reports"
              description="Real-time revenue, COGS, and profit tracking. Monitor your receivables and payables across the entire business."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
              title="Role-Based Access"
              description="Strict data isolation. Cashiers only see their assigned shop, while Owners and Managers get the full picture."
            />
            <FeatureCard 
              icon={<Package className="w-6 h-6 text-emerald-600" />}
              title="Wholesale Pricing"
              description="Securely hide wholesale costs from front-line staff while maintaining accurate profit margin calculations."
            />
          </motion.div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              From zero to selling in minutes
            </h2>
            <p className="text-lg text-gray-600">
              A streamlined onboarding process gets your business up and running immediately.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-emerald-200 -translate-y-1/2 z-0" />
            
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              className="grid lg:grid-cols-4 gap-8 relative z-10"
            >
              <StepCard 
                number="01"
                title="Sign Up"
                description="Create your DukaanSync account securely with Google or email."
              />
              <StepCard 
                number="02"
                title="Business Setup"
                description="Register your business name and set your base currency in our onboarding wizard."
              />
              <StepCard 
                number="03"
                title="Add Your First Shop"
                description="Create a branch location and add your initial inventory products."
              />
              <StepCard 
                number="04"
                title="Start Selling"
                description="Open the POS terminal and start processing sales instantly."
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. PRICING */}
      <section className="py-24 bg-white relative">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-gray-50 to-white -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Choose the plan that fits your retail footprint. No hidden fees. Upgrade easily via EasyPaisa or JazzCash.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {PLAN_TIERS.map((plan) => (
              <motion.div 
                key={plan.id}
                variants={fadeUp}
                className={`relative rounded-2xl flex flex-col p-8 transition-transform hover:-translate-y-1 ${
                  plan.popular 
                    ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20 ring-1 ring-gray-900" 
                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold ${plan.popular ? "text-gray-100" : "text-gray-900"}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.pricePKR}
                    </span>
                    <span className={`text-sm ${plan.popular ? "text-gray-400" : "text-gray-500"}`}>
                      / {plan.period}
                    </span>
                  </div>
                  <p className={`mt-4 text-sm ${plan.popular ? "text-gray-300" : "text-gray-500"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="flex-1 space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <MapPin className={`w-5 h-5 shrink-0 ${plan.popular ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={`font-medium ${plan.popular ? "text-gray-100" : "text-gray-900"}`}>
                      {plan.maxShopsText}
                    </span>
                  </li>
                  {plan.features.slice(1).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${plan.popular ? "text-emerald-400" : "text-emerald-600"}`} />
                      <span className={`text-sm ${plan.popular ? "text-gray-300" : "text-gray-600"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/login"
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-center transition-colors ${
                    plan.popular
                      ? "bg-[#10B981] hover:bg-[#059669] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 5. CTA FOOTER SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900 -z-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-gray-900 to-gray-900 -z-10" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
              Ready to synchronize your shops?
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Join the platform built to help Pakistani retailers scale without losing control of their data.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-medium text-lg shadow-lg shadow-emerald-500/25 transition-transform hover:-translate-y-1"
            >
              Start Your Free Plan
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

// Subcomponents

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div variants={fadeUp} className="glass-card p-6 flex flex-col items-start text-left group hover:border-emerald-200 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <motion.div variants={fadeUp} className="relative flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm z-10 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-full bg-emerald-100 border-4 border-white shadow-sm flex items-center justify-center text-emerald-700 font-bold text-lg mb-4">
        {number}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.div>
  );
}
