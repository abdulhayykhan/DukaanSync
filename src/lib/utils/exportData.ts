import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  filename: string;
  data: Record<string, string | number | boolean | null>[];
}

export function exportToCSV({ filename, data }: ExportOptions) {
  if (data.length === 0) return;
  
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel({ filename, data }: ExportOptions) {
  if (data.length === 0) return;
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
