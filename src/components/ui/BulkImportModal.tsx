"use client";

import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, UploadCloud, Download, CheckCircle, AlertCircle, Loader2, RefreshCw, PlusCircle, SkipForward } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

import { Button } from "@/components/ui/Button";
import { parseFile } from "@/lib/utils/fileParser";

export type DuplicateStrategy = "upsert" | "skip" | "add_stock";

export interface BulkImportResult {
  successCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface BulkImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sampleData: Record<string, string | number>[];
  expectedColumns: string[];
  onValidateRow: (row: Record<string, string | number | boolean | null>) => { isValid: boolean; data?: T; errors?: string[] };
  onImport: (
    validRows: T[],
    duplicateStrategy: DuplicateStrategy,
    onProgress: (processed: number, total: number) => void
  ) => Promise<BulkImportResult>;
  onSuccess: () => void;
}

type Step = "UPLOAD" | "PREVIEW" | "IMPORTING" | "RESULT";

interface ValidatedRow<T> {
  raw: Record<string, string | number | boolean | null>;
  isValid: boolean;
  data?: T;
  errors?: string[];
}

const STRATEGY_OPTIONS: { value: DuplicateStrategy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "upsert",
    label: "Update Existing Items",
    description: "Matching SKUs will be updated with new prices, category, and stock quantity.",
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    value: "add_stock",
    label: "Add to Existing Stock",
    description: "Matching SKUs will have the imported quantity added on top of current stock.",
    icon: <PlusCircle className="w-4 h-4" />,
  },
  {
    value: "skip",
    label: "Skip Duplicates",
    description: "Matching SKUs are ignored. Only brand-new SKUs will be created.",
    icon: <SkipForward className="w-4 h-4" />,
  },
];

export function BulkImportModal<T>({
  isOpen,
  onClose,
  title,
  sampleData,
  expectedColumns,
  onValidateRow,
  onImport,
  onSuccess,
}: BulkImportModalProps<T>) {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow<T>[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("upsert");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_${title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Parsing file...", { id: "parsing" });
      const rawData = await parseFile(file);

      const processed: ValidatedRow<T>[] = rawData.map(row => {
        const validation = onValidateRow(row);
        return {
          raw: row,
          isValid: validation.isValid,
          data: validation.data,
          errors: validation.errors
        };
      });

      setValidatedRows(processed);
      setStep("PREVIEW");
      toast.success("File parsed successfully", { id: "parsing" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file", { id: "parsing" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    const validData = validatedRows.filter(r => r.isValid && r.data).map(r => r.data as T);
    if (validData.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setStep("IMPORTING");
    setProgress({ processed: 0, total: validData.length });

    try {
      const result = await onImport(validData, duplicateStrategy, (processed, total) => {
        setProgress({ processed, total });
      });
      setImportResult(result);
      setStep("RESULT");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
      setStep("PREVIEW"); // Revert on total failure
    }
  };

  const resetAndClose = () => {
    setStep("UPLOAD");
    setValidatedRows([]);
    setImportResult(null);
    setProgress({ processed: 0, total: 0 });
    setDuplicateStrategy("upsert");
    onClose();
  };

  const validCount = validatedRows.filter(r => r.isValid).length;
  const invalidCount = validatedRows.filter(r => !r.isValid).length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={resetAndClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-in fade-in" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl z-50 p-6 flex flex-col max-h-[90vh]"
          aria-describedby={undefined}
        >

          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">{title}</Dialog.Title>
            </div>
            <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {step === "UPLOAD" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your spreadsheet</h3>
                <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
                  We accept .csv, .xls, and .xlsx files. Make sure your headers match the expected format.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleDownloadSample}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Select File
                  </Button>
                </div>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {step === "PREVIEW" && (
              <div className="flex-1 flex flex-col min-h-0 gap-4">
                {/* Duplicate Strategy Selector */}
                <div className="shrink-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">How should we handle existing SKUs?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STRATEGY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDuplicateStrategy(opt.value)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          duplicateStrategy === opt.value
                            ? "border-emerald-500 bg-emerald-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${
                          duplicateStrategy === opt.value ? "text-emerald-700" : "text-gray-800"
                        }`}>
                          <span className={duplicateStrategy === opt.value ? "text-emerald-600" : "text-gray-400"}>
                            {opt.icon}
                          </span>
                          {opt.label}
                        </div>
                        <p className="text-xs text-gray-500 leading-snug">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row Summary & Import Button */}
                <div className="flex justify-between items-center shrink-0">
                  <div className="flex gap-3 text-sm font-medium">
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      {validCount} Valid Rows
                    </span>
                    {invalidCount > 0 && (
                      <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                        {invalidCount} Invalid Rows
                      </span>
                    )}
                  </div>
                  <Button onClick={handleImport} disabled={validCount === 0}>
                    Import {validCount} Records
                  </Button>
                </div>

                {/* Preview Table */}
                <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0 border-b border-gray-200 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        {expectedColumns.map(col => (
                          <th key={col} className="px-4 py-3 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validatedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? "bg-white hover:bg-emerald-50/30" : "bg-red-50/50"}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.isValid ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <div className="flex flex-col gap-1 py-1">
                                {row.errors?.map((err, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    • {err}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          {expectedColumns.map(col => (
                            <td key={col} className={`px-4 py-3 max-w-[200px] truncate ${!row.isValid ? 'text-red-900' : 'text-gray-900'}`}>
                              {String(row.raw[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === "IMPORTING" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-[#10B981] animate-spin mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Importing Data...</h3>
                <p className="text-gray-500 mb-6">Please do not close this window.</p>
                <div className="w-full max-w-md bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
                  <div
                    className="bg-[#10B981] h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  {progress.processed} / {progress.total} completed
                </p>
              </div>
            )}

            {step === "RESULT" && importResult && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Import Complete!</h3>

                {/* Detailed Result Summary */}
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {importResult.successCount > 0 && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-2 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      {importResult.successCount} new records imported
                    </div>
                  )}
                  {importResult.updatedCount > 0 && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm font-semibold">
                      <RefreshCw className="w-4 h-4" />
                      {importResult.updatedCount} existing records updated
                    </div>
                  )}
                  {importResult.skippedCount > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-semibold">
                      <SkipForward className="w-4 h-4" />
                      {importResult.skippedCount} duplicates skipped
                    </div>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="w-full max-w-2xl bg-red-50 border border-red-100 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                    <h4 className="font-semibold text-red-800 mb-2">Some errors occurred during batch write:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={() => {
                  onSuccess();
                  resetAndClose();
                }}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
