import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full glass-card bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full" />
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-3">Page Not Found</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          The page or resource you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold">
              <Home className="w-4 h-4" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
