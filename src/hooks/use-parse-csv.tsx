import Papa from "papaparse";

export function useParseCSV() {
  const parse = (file: File, options?: Papa.ParseConfig) => {
    return new Promise<{ data: Record<string, unknown>[]; fields: string[] }>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          const csvText = event.target?.result;
          if (typeof csvText !== "string") {
            reject(new Error("Failed to read file as text"));
            return;
          }

          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const fields = Array.isArray(results.meta.fields)
                ? results.meta.fields
                : [];
              const data = Array.isArray(results.data)
                ? (results.data as Record<string, unknown>[])
                : [];
              resolve({
                data,
                fields,
              });
            },
            error: reject,
            ...options,
          } as Papa.ParseConfig);
        };

        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsText(file);
      }
    );
  };

  return { parse };
}