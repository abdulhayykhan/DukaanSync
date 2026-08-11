import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseFile(file: File): Promise<Record<string, string | number | boolean | null>[]> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as Record<string, string | number | boolean | null>[]);
        },
        error: (error) => {
          reject(error);
        },
      });
    } else if (fileExt === 'xls' || fileExt === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          resolve(json as Record<string, string | number | boolean | null>[]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsBinaryString(file);
    } else {
      reject(new Error(`Unsupported file type: ${fileExt}`));
    }
  });
}
