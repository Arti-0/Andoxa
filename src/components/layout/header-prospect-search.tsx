"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface ProspectHit {
  id: string;
  full_name: string | null;
  company: string | null;
}

export function HeaderProspectSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProspectHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/prospects?search=${encodeURIComponent(t)}&pageSize=8`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setResults((data.items ?? []) as ProspectHit[]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchResults(q), 250);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    setQ("");
    setResults([]);
    router.push(`/prospect/${id}`);
  };

  const showPanel = open && q.trim().length >= 2;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[200px] shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/40 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-[240px]"
    >
      <label className="flex items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="header-prospect-search"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-label="Rechercher un prospect"
          placeholder="Rechercher un prospect…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) {
              e.preventDefault();
              go(results[0].id);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
      </label>
      {showPanel && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Aucun prospect trouvé</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(p.id)}
              >
                <span className="font-medium">{p.full_name ?? "Sans nom"}</span>
                {p.company ? (
                  <span className="text-xs text-muted-foreground">{p.company}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
