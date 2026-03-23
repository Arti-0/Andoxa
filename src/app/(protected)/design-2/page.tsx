"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Phone,
  Mail,
  Linkedin,
  CheckCircle,
  Circle,
  ArrowUpDown,
  Building2,
  GripVertical,
} from "lucide-react";

const STATUSES = [
  { value: "new", label: "Nouveau", dot: "bg-slate-400" },
  { value: "contacted", label: "Contacté", dot: "bg-blue-500" },
  { value: "qualified", label: "Qualifié", dot: "bg-amber-500" },
  { value: "rdv", label: "RDV", dot: "bg-emerald-500" },
  { value: "won", label: "Signé", dot: "bg-green-600" },
  { value: "lost", label: "Perdu", dot: "bg-red-500" },
];

const DEMO_PROSPECTS = [
  { id: "1", name: "Jean Dupont", company: "Acme Corp", role: "CEO", status: "qualified", phone: "+33 6 12 34 56 78", email: "jean@acme.fr", hasLinkedin: true },
  { id: "2", name: "Marie Martin", company: "TechStartup", role: "CTO", status: "contacted", phone: "+33 6 98 76 54 32", email: "marie@tech.io", hasLinkedin: true },
  { id: "3", name: "Paul Lefèvre", company: "BioSanté", role: "Directeur Commercial", status: "new", phone: "", email: "paul@bio.com", hasLinkedin: false },
  { id: "4", name: "Sophie Bernard", company: "FinGroup", role: "VP Sales", status: "rdv", phone: "+33 6 11 22 33 44", email: "sophie@fin.fr", hasLinkedin: true },
  { id: "5", name: "Lucas Moreau", company: "GreenEnergy", role: "Founder", status: "won", phone: "+33 6 55 66 77 88", email: "lucas@green.io", hasLinkedin: true },
  { id: "6", name: "Camille Rousseau", company: "DataFlow", role: "Head of Growth", status: "lost", phone: "+33 6 00 11 22 33", email: "camille@data.fr", hasLinkedin: false },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((st) => st.value === status) ?? STATUSES[0];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function KanbanColumn({ title, status, count }: { title: string; status: string; count: number }) {
  const statusInfo = STATUSES.find((s) => s.value === status);
  const prospects = DEMO_PROSPECTS.filter((p) => p.status === status);
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <span className={`h-2.5 w-2.5 rounded-full ${statusInfo?.dot ?? "bg-slate-400"}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{count}</span>
      </div>
      <div className="flex-1 space-y-2 p-3 min-h-[120px]">
        {prospects.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-3 shadow-xs cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
              <p className="truncate text-sm font-medium">{p.name}</p>
            </div>
            <p className="mt-1 pl-5 text-xs text-muted-foreground">{p.company}</p>
          </div>
        ))}
        {prospects.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground">Aucun prospect</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Design2Page() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc] = useState(true);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === DEMO_PROSPECTS.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(DEMO_PROSPECTS.map((p) => p.id)));
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Design 2 — CRM & Tables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data tables with selection, prospect cards, Kanban columns, and filter patterns.
        </p>
      </div>

      {/* Section: Toolbar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Toolbar</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un prospect..."
              className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
            <Filter className="h-3.5 w-3.5" /> Filtres
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
            Statut <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {selectedRows.size > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{selectedRows.size} sélectionné(s)</span>
          )}
        </div>
      </section>

      {/* Section: Data Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Data Table</h2>
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className="flex items-center justify-center">
                    {selectedRows.size === DEMO_PROSPECTS.length ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <button onClick={() => setSortAsc(!sortAsc)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Prospect
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {DEMO_PROSPECTS.map((p) => {
                const isSelected = selectedRows.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b last:border-0 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleRow(p.id)} className="flex items-center justify-center">
                        {isSelected ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {p.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{p.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                        {p.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                        {p.hasLinkedin && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="rounded-md p-1 hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Kanban */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kanban</h2>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <KanbanColumn
              key={s.value}
              title={s.label}
              status={s.value}
              count={DEMO_PROSPECTS.filter((p) => p.status === s.value).length}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
