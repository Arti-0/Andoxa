"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  User,
  Wrench,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useWorkspace } from "@/lib/workspace";
import { normalizePlanIdForRoutes } from "@/lib/billing/effective-plan";
import { canAccessRoute, type PlanId } from "@/lib/config/plans-config";

const PAGES = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: Users },
  { label: "Campagnes & Appels", href: "/campaigns", icon: Megaphone },
  { label: "Messagerie", href: "/messagerie", icon: MessageSquare },
  { label: "Calendrier", href: "/calendar", icon: Calendar },
  { label: "Installation", href: "/installation", icon: Wrench },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

interface ProspectResult {
  id: string;
  full_name: string | null;
  company: string | null;
  status: string | null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [prospects, setProspects] = useState<ProspectResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { workspace } = useWorkspace();
  const routePlan = normalizePlanIdForRoutes(
    workspace?.plan,
    workspace?.subscription_status
  ) as PlanId;
  const visiblePages = PAGES.filter((p) => canAccessRoute(routePlan, p.href));

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchProspects = useCallback(async (q: string) => {
    if (q.length < 2) {
      setProspects([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/prospects?search=${encodeURIComponent(q)}&pageSize=8`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setProspects((data.items ?? []) as ProspectResult[]);
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProspects(query), 200);
    return () => clearTimeout(t);
  }, [query, searchProspects]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Recherche rapide"
      description="Recherchez un prospect par nom ou entreprise"
    >
      <CommandInput
        placeholder="Rechercher un prospect..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Recherche..." : "Aucun résultat"}
        </CommandEmpty>
        {prospects.length > 0 && (
          <CommandGroup heading="Prospects">
            {prospects.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => navigate(`/prospect/${p.id}`)}
              >
                <User className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{p.full_name ?? "Sans nom"}</span>
                {p.company && (
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {p.company}
                  </span>
                )}
                {p.status && (
                  <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
                    {p.status}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!hasQuery && (
          <CommandGroup heading="Pages">
            {visiblePages.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  onSelect={() => navigate(page.href)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {page.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
