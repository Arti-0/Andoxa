"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, User, Users, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Attendee = {
  email: string;
  label: string;
  source: "prospect" | "colleague" | "manual" | "creator";
  /** Stable id from prospects.id or organization_members.user_id when available. */
  refId?: string;
  /** Whether the chip can be removed by the user. Defaults to true. */
  removable?: boolean;
};

type ProspectHit = {
  id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
};

type MemberHit = {
  id: string;
  user_id?: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

interface AttendeeComboboxProps {
  value: Attendee[];
  onChange: (next: Attendee[]) => void;
  /** Disable picking — read-only display. */
  disabled?: boolean;
  /** Emails already in the list will be hidden from search results. */
  placeholder?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AttendeeCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Ajouter un invité…",
}: AttendeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [prospects, setProspects] = useState<ProspectHit[]>([]);
  const [members, setMembers] = useState<MemberHit[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchToken = useRef(0);

  // Debounce search query.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  // Load colleagues once when popover first opens.
  useEffect(() => {
    if (!open) return;
    if (members.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/organization/members", {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        const items: MemberHit[] =
          (json?.data?.items ?? json?.items ?? []) as MemberHit[];
        if (!cancelled) setMembers(items);
      } catch {
        // Non-fatal: fall back to prospects-only search.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, members.length]);

  // Search prospects on query change (only when popover is open).
  useEffect(() => {
    if (!open) return;
    const token = ++fetchToken.current;
    if (!debouncedQuery.trim()) {
      setProspects([]);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams({
          search: debouncedQuery.trim(),
          pageSize: "10",
        });
        const res = await fetch(`/api/prospects?${params}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (token !== fetchToken.current) return;
        const items: ProspectHit[] =
          (json?.data?.items ?? json?.items ?? []) as ProspectHit[];
        setProspects(items.filter((p) => p.email && p.email.length > 0));
      } catch {
        // ignore
      } finally {
        if (token === fetchToken.current) setLoading(false);
      }
    })();
  }, [debouncedQuery, open]);

  const existingEmails = useMemo(
    () => new Set(value.map((a) => a.email.toLowerCase())),
    [value]
  );

  const filteredProspects = useMemo(
    () =>
      prospects.filter(
        (p) => p.email && !existingEmails.has(p.email.toLowerCase())
      ),
    [prospects, existingEmails]
  );

  const filteredMembers = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (!m.email) return false;
      if (existingEmails.has(m.email.toLowerCase())) return false;
      if (!q) return true;
      return (
        (m.name ?? "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    });
  }, [members, debouncedQuery, existingEmails]);

  const trimmed = query.trim();
  const canAddManual =
    EMAIL_RE.test(trimmed) && !existingEmails.has(trimmed.toLowerCase());

  function add(att: Attendee) {
    onChange([...value, att]);
    setQuery("");
  }

  function remove(email: string) {
    onChange(value.filter((a) => a.email.toLowerCase() !== email.toLowerCase()));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((a) => {
          const removable = a.removable ?? true;
          return (
            <Badge
              key={a.email}
              variant="outline"
              className={cn(
                "h-7 gap-1 pl-2 pr-1 font-normal",
                a.source === "creator" && "bg-foreground/5"
              )}
              title={a.email}
            >
              {a.source === "colleague" ? (
                <Users className="h-3 w-3 text-muted-foreground" />
              ) : a.source === "prospect" ? (
                <User className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Mail className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="max-w-[180px] truncate">{a.label || a.email}</span>
              {removable && !disabled ? (
                <button
                  type="button"
                  onClick={() => remove(a.email)}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Retirer ${a.label || a.email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          );
        })}
      </div>

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Nom, e-mail ou collègue…"
              />
              <CommandList>
                {!loading && !filteredProspects.length && !filteredMembers.length && !canAddManual && (
                  <CommandEmpty>Aucun résultat.</CommandEmpty>
                )}

                {filteredMembers.length > 0 && (
                  <CommandGroup heading="Collègues">
                    {filteredMembers.map((m) => (
                      <CommandItem
                        key={`mem-${m.user_id ?? m.id}`}
                        value={`mem-${m.email}`}
                        onSelect={() =>
                          add({
                            email: m.email!,
                            label: m.name ?? m.email!,
                            source: "colleague",
                            refId: m.user_id ?? m.id,
                          })
                        }
                      >
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {m.name ?? m.email}
                          </span>
                          {m.name && (
                            <span className="truncate text-xs text-muted-foreground">
                              {m.email}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {filteredMembers.length > 0 && filteredProspects.length > 0 && (
                  <CommandSeparator />
                )}

                {filteredProspects.length > 0 && (
                  <CommandGroup heading="Prospects">
                    {filteredProspects.map((p) => (
                      <CommandItem
                        key={`pro-${p.id}`}
                        value={`pro-${p.email}`}
                        onSelect={() =>
                          add({
                            email: p.email!,
                            label: p.full_name ?? p.email!,
                            source: "prospect",
                            refId: p.id,
                          })
                        }
                      >
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {p.full_name ?? p.email}
                          </span>
                          {p.full_name && (
                            <span className="truncate text-xs text-muted-foreground">
                              {p.email}
                              {p.company ? ` · ${p.company}` : ""}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {canAddManual && (
                  <>
                    {(filteredMembers.length > 0 || filteredProspects.length > 0) && (
                      <CommandSeparator />
                    )}
                    <CommandGroup heading="Adresse manuelle">
                      <CommandItem
                        value={`manual-${trimmed}`}
                        onSelect={() =>
                          add({
                            email: trimmed,
                            label: trimmed,
                            source: "manual",
                          })
                        }
                      >
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        Inviter <span className="ml-1 font-medium">{trimmed}</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
