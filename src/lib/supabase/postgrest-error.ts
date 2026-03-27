/**
 * PostgREST / Supabase client errors often print as `{}` in the browser console
 * because fields may be non-enumerable. Use this for structured logs.
 */
export function serializePostgrestError(err: unknown): Record<string, string> {
  if (err == null) {
    return { message: "null_or_undefined" };
  }
  if (typeof err !== "object") {
    return { message: String(err) };
  }

  const e = err as Record<string, unknown>;
  const out: Record<string, string> = {};

  for (const key of ["message", "code", "details", "hint"] as const) {
    const v = e[key];
    if (v != null && v !== "") {
      out[key] = typeof v === "string" ? v : String(v);
    }
  }

  if (Object.keys(out).length === 0 && err instanceof Error) {
    out.message = err.message || err.name || "Error";
  }

  if (Object.keys(out).length === 0) {
    out.message = "empty_error_object";
  }

  return out;
}

/** False for `{}` or other truthy garbage — avoids treating flaky client errors as fatal. */
export function isMeaningfulPostgrestError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err !== "object") return true;
  if (err instanceof Error && err.message.trim() !== "") return true;
  const e = err as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return Boolean(s(e.message) || s(e.code) || s(e.details) || s(e.hint));
}
