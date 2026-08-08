import { ReactNode } from "react";
import { Store } from "lucide-react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#10B981] p-2 rounded-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">DukaanSync</span>
          </div>
        </div>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
