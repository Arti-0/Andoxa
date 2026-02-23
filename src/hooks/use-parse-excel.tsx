import * as XLSX from "xlsx";

export function useParseExcel() {
  const parse = (file: File) => {
    return new Promise<{ data: Record<string, unknown>[]; fields: string[] }>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          try {
            const arrayBuffer = event.target?.result;
            if (!arrayBuffer) {
              reject(new Error("Failed to read file"));
              return;
            }

            // Read the workbook
            const workbook = XLSX.read(arrayBuffer, {
              type: "array",
              cellDates: true,
              cellNF: false,
              cellText: false,
            });

            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) {
              reject(new Error("No sheets found in Excel file"));
              return;
            }

            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON with header row (returns array of arrays)
            const jsonData = XLSX.utils.sheet_to_json<unknown[]>(
              worksheet,
              {
                header: 1,
                defval: "",
                raw: false,
              }
            );

            if (jsonData.length === 0) {
              reject(new Error("Excel file is empty"));
              return;
            }

            // First row is headers
            const headers = (jsonData[0] as unknown[]) as string[];
            const fields = headers.filter((h) => h && typeof h === "string");

            // Rest of the rows are data
            const data = jsonData.slice(1).map((row) => {
              const record: Record<string, unknown> = {};
              const rowArray = row as unknown[];
              headers.forEach((header, index) => {
                if (header && typeof header === "string") {
                  record[header] = rowArray[index] ?? "";
                }
              });
              return record;
            });

            // Filter out completely empty rows
            const filteredData = data.filter((row) =>
              Object.values(row).some((val) => val !== "" && val !== null && val !== undefined)
            );

            resolve({
              data: filteredData,
              fields,
            });
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to parse Excel file")
            );
          }
        };

        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsArrayBuffer(file);
      }
    );
  };

  return { parse };
}

