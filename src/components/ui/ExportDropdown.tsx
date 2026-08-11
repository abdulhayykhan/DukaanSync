"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface ExportDropdownProps {
  onExport: (format: "csv" | "excel") => Promise<void> | void;
  isLoading?: boolean;
  label?: string;
}

export function ExportDropdown({ onExport, isLoading = false, label = "Export Data" }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      await onExport(format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const activeLoading = isLoading || isExporting;

  // Since we don't have Radix DropdownMenu installed necessarily, we'll build a simple custom popover using native elements and states.
  // Wait, let's use a native open/close toggle to avoid adding extra dependencies, or just use two buttons.
  // Actually, a simple relative div with an absolute dropdown works perfectly.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <Button 
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={activeLoading}
        className="flex items-center gap-2"
      >
        {activeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {label}
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden glass-card border border-gray-200">
            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleExport("csv");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                Export as CSV
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleExport("excel");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                Export as Excel (.xlsx)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
