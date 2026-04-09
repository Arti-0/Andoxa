"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Search,
  Loader2,
  ExternalLink,
  UserPlus,
  Link2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProspectHit {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  status: string | null;
}

interface ChatCrmPanelProps {
  chatId: string;
  prospectId: string | null;
  onLinked: (chatId: string, prospectId: string) => void;
}

function LinkedProspectCard({
  prospectId,
  onNavigate,
}: {
  prospectId: string;
  onNavigate: () => void;
}) {
  const [prospect, setProspect] = useState<ProspectHit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/prospects/${prospectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json) {
          setProspect(null);
          return;
        }
        const data = json.success ? json.data : (json?.data ?? json);
        setProspect((data as ProspectHit) ?? null);
      })
      .catch(() => setProspect(null))
      .finally(() => setLoading(false));
  }, [prospectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <p className="text-sm text-muted-foreground">Prospect introuvable</p>
    );
  }

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    contacted:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    qualified:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    converted:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {prospect.full_name ?? "Sans nom"}
          </p>
          {prospect.company && (
            <p className="truncate text-xs text-muted-foreground">
              {prospect.company}
            </p>
          )}
          {prospect.job_title && (
            <p className="truncate text-xs text-muted-foreground">
              {prospect.job_title}
            </p>
          )}
        </div>
      </div>

      {prospect.status && (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[prospect.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {prospect.status}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={onNavigate}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Voir la fiche prospect
      </Button>
    </div>
  );
}

function ProspectSearchInput({
  onSelect,
}: {
  onSelect: (prospect: ProspectHit) => void;
}) {
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
    const t = setTimeout(() => void fetchResults(q), 250);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="Nom, entreprise…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucun prospect
            </p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.full_name ?? "Sans nom"}</span>
                {p.company && (
                  <span className="text-xs text-muted-foreground">
                    {p.company}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CreateProspectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (prospect: ProspectHit) => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim(),
          company: company.trim() || undefined,
          source: "messaging",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json?.error?.message ?? "Erreur lors de la création"
        );
        return;
      }
      const data = (json.success ? json.data : (json?.data ?? json)) as ProspectHit;
      toast.success("Prospect créé");
      onCreated(data);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="crm-full-name" className="text-xs">
          Nom complet *
        </Label>
        <Input
          id="crm-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Prénom Nom"
          className="h-8 text-sm"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm-company" className="text-xs">
          Entreprise
        </Label>
        <Input
          id="crm-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nom de l'entreprise"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={loading || !fullName.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Créer"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ChatCrmPanel({ chatId, prospectId, onLinked }: ChatCrmPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "link" | "create">("idle");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setMode("idle");
  }, [chatId]);

  const linkChat = useCallback(
    async (prospect: ProspectHit) => {
      setLinking(true);
      try {
        const res = await fetch("/api/unipile/chats/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            chat_id: chatId,
            prospect_id: prospect.id,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(
            json?.error?.message ?? "Erreur lors de la liaison"
          );
          return;
        }
        toast.success(
          `Conversation liée à ${prospect.full_name ?? "ce prospect"}`
        );
        onLinked(chatId, prospect.id);
        setMode("idle");
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setLinking(false);
      }
    },
    [chatId, onLinked]
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-t bg-card lg:border-l lg:border-t-0">
      <div className="shrink-0 border-b px-4 py-3">
        <p className="text-sm font-semibold">CRM</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {prospectId ? (
          <LinkedProspectCard
            prospectId={prospectId}
            onNavigate={() => router.push(`/prospect/${prospectId}`)}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cette conversation n&apos;est pas liée à un prospect Andoxa.
            </p>

            {mode === "idle" && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setMode("link")}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Lier à un prospect existant
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setMode("create")}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Créer un prospect
                </Button>
              </div>
            )}

            {mode === "link" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Rechercher un prospect</p>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ProspectSearchInput onSelect={(p) => void linkChat(p)} />
                {linking && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Liaison en cours…
                  </div>
                )}
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Nouveau prospect</p>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <CreateProspectForm
                  onCreated={(p) => void linkChat(p)}
                  onCancel={() => setMode("idle")}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
