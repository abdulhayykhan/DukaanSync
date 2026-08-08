import { ReactNode } from "react";
import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[#10B981] p-2 rounded-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">DukaanSync</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Manage your retail business
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          One account. One login. Multiple shops.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
