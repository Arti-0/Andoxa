/**
 * Product-UI mockups for the marketing site.
 *
 * These replace the static screenshots (`/public/screenshots/*`) with live,
 * crisp, fully-tweakable React. Each component fills its parent
 * (`absolute inset-0`) — drop it inside `ScreenshotFrame`, `BrowserCard`, or any
 * `relative` box with an aspect ratio. They are purely presentational: no data,
 * no client hooks, safe to render server-side.
 *
 * Built to mirror the real `(protected)` pages closely enough to read as the
 * product, while staying lightweight. Tweak freely — colours come from the
 * brand tokens in globals.css.
 */
import { cn } from "@/lib/utils";

/* ── shared atoms ─────────────────────────────────────────────────────────── */

function Bar({ w = "100%", h = 6, tint }: { w?: string | number; h?: number; tint?: boolean }) {
  return (
    <span
      className={cn("block rounded-full", tint ? "bg-[var(--brand-blue)]/30" : "bg-[var(--neutral-200)]")}
      style={{ width: w, height: h }}
    />
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2 rounded-full" style={{ background: color }} />;
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex select-none bg-[var(--neutral-50)] text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Sidebar({ active }: { active: number }) {
  const items = ["Tableau de bord", "CRM", "Campagnes", "Workflows", "Messagerie", "Calendrier"];
  return (
    <aside className="hidden w-[20%] min-w-[120px] flex-col gap-1 border-r border-[var(--border)] bg-card p-2.5 sm:flex">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="grid size-4 place-items-center rounded bg-[var(--brand-blue)] text-[8px] font-bold text-white">
          A
        </span>
        <span className="text-[10px] font-semibold tracking-tight">Andoxa</span>
      </div>
      {items.map((it, i) => (
        <div
          key={it}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[9px]",
            i === active
              ? "bg-[var(--brand-blue-tint)] font-semibold text-[var(--brand-blue)]"
              : "text-muted-foreground",
          )}
        >
          <span className="size-2 rounded-sm bg-current opacity-40" />
          <span className="truncate">{it}</span>
        </div>
      ))}
    </aside>
  );
}

function Topbar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-card px-3 py-2">
      <span className="text-[11px] font-semibold tracking-tight">{title}</span>
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-[var(--brand-blue)] px-2 py-0.5 text-[8px] font-semibold text-white">
          + Créer
        </span>
        <Avatar initials="SB" color="#0052D9" />
      </div>
    </div>
  );
}

/* ── 1. Dashboard ─────────────────────────────────────────────────────────── */

// Mirrors the real /dashboard: priorities band → KPI grid → funnel + deals.
const DASH_PRIORITIES = [
  { c: "#FF6700", t: "3 RDV aujourd'hui" },
  { c: "#0052D9", t: "5 conversations à relancer" },
  { c: "#0E7A3A", t: "8 réponses non lues" },
  { c: "#5B2EBF", t: "2 propositions à suivre" },
  { c: "#DC2626", t: "2 deals silencieux > 7j" },
];
const DASH_KPIS = [
  { label: "Pipeline actif", value: "82 k€", delta: "+12%", up: true },
  { label: "RDV bookés", value: "38", delta: "+24%", up: true },
  { label: "Taux réponse", value: "32%", delta: "−4%", up: false },
  { label: "Closings", value: "5/8", delta: "objectif", up: true },
];
const DASH_FUNNEL = [
  { label: "Invit.", flex: 10, c: "#003EA3" },
  { label: "Acceptées", flex: 6, c: "#0052D9" },
  { label: "Convers.", flex: 3.5, c: "#1A6AFF" },
  { label: "RDV", flex: 1.6, c: "#5B8DEF" },
];

export function DashboardMockup() {
  return (
    <Shell>
      <Sidebar active={0} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Tableau de bord" />
        <div className="flex-1 space-y-2 overflow-hidden p-3">
          {/* Priorities band */}
          <div className="rounded-lg border border-[var(--brand-blue)]/20 bg-[var(--brand-blue-tint)]/50 p-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Dot color="#0052D9" />
              <span className="text-[8.5px] font-semibold">Mes priorités du jour</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {DASH_PRIORITIES.map((p) => (
                <div key={p.t} className="rounded-md border border-[var(--border)] bg-card p-1">
                  <span className="block size-1.5 rounded-full" style={{ background: p.c }} />
                  <span className="mt-1 block text-[7px] leading-tight text-muted-foreground">{p.t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* KPI grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {DASH_KPIS.map((k) => (
              <div key={k.label} className="rounded-lg border border-[var(--border)] bg-card p-1.5">
                <div className="text-[7.5px] text-muted-foreground">{k.label}</div>
                <div className="mt-0.5 text-[13px] font-semibold tabular tracking-tight">{k.value}</div>
                <div
                  className="text-[7px] font-medium"
                  style={{ color: k.up ? "#0E7A3A" : "#A8221C" }}
                >
                  {k.delta}
                </div>
              </div>
            ))}
          </div>
          {/* Funnel + deals à risque */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-[var(--border)] bg-card p-2">
              <div className="mb-1.5 text-[8px] font-semibold">Funnel de conversion</div>
              <div className="space-y-1">
                {DASH_FUNNEL.map((f) => (
                  <div key={f.label} className="flex items-center gap-1">
                    <span className="w-10 shrink-0 text-[6.5px] text-muted-foreground">{f.label}</span>
                    <span
                      className="h-2 rounded-sm"
                      style={{ background: f.c, flex: f.flex }}
                    />
                    <span className="flex-[12]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-card p-2">
              <div className="mb-1.5 flex items-center gap-1 text-[8px] font-semibold">
                <span className="size-1.5 rounded-full bg-rose-500" />
                Deals à risque
              </div>
              <div className="space-y-1">
                {["Spendesk · 14 j", "Qonto · 9 j", "Alan · 8 j"].map((d) => (
                  <div key={d} className="flex items-center justify-between rounded-md bg-rose-50/60 px-1.5 py-1 dark:bg-rose-950/20">
                    <span className="text-[7.5px] text-muted-foreground">{d}</span>
                    <span className="rounded bg-rose-500/15 px-1 text-[6.5px] font-semibold text-rose-600">
                      Relancer
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 2. Inbox / Messagerie ────────────────────────────────────────────────── */

export function InboxMockup() {
  return (
    <Shell>
      <Sidebar active={4} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Messagerie" />
        <div className="flex flex-1 overflow-hidden">
          {/* convo list */}
          <div className="w-[34%] space-y-1.5 border-r border-[var(--border)] bg-card p-2">
            {[
              { n: "Camille R.", i: "CR", c: "#0052D9", ch: "in" },
              { n: "Andréas B.", i: "AB", c: "#FF6700", ch: "wa" },
              { n: "Mathieu L.", i: "ML", c: "#5B2EBF", ch: "in" },
              { n: "Sophie N.", i: "SN", c: "#0E7A3A", ch: "wa" },
            ].map((m, i) => (
              <div
                key={m.n}
                className={cn(
                  "flex items-center gap-1.5 rounded-md p-1.5",
                  i === 0 && "bg-[var(--brand-blue-tint)]",
                )}
              >
                <Avatar initials={m.i} color={m.c} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[9px] font-semibold">{m.n}</div>
                  <Bar w="80%" h={3} />
                </div>
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: m.ch === "wa" ? "#25D366" : "#0A66C2" }}
                />
              </div>
            ))}
          </div>
          {/* thread */}
          <div className="flex flex-1 flex-col bg-[var(--neutral-50)] p-2">
            <div className="space-y-1.5">
              <div className="ml-auto max-w-[70%] rounded-lg rounded-tr-sm bg-[var(--brand-blue)] p-1.5">
                <Bar w={70} h={3} tint />
                <span className="mt-1 block h-1" />
                <Bar w={50} h={3} tint />
              </div>
              <div className="max-w-[70%] rounded-lg rounded-tl-sm border border-[var(--border)] bg-card p-1.5">
                <Bar w={80} h={3} />
                <span className="mt-1 block h-1" />
                <Bar w={40} h={3} />
              </div>
              <div className="ml-auto max-w-[60%] rounded-lg rounded-tr-sm bg-[var(--brand-blue)] p-1.5">
                <Bar w={55} h={3} tint />
              </div>
            </div>
            <div className="mt-auto flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-card p-1.5">
              <Bar w="70%" h={4} />
              <span className="ml-auto rounded bg-[var(--brand-blue)] px-1.5 py-0.5 text-[7px] font-bold text-white">
                Envoyer
              </span>
            </div>
          </div>
          {/* crm panel */}
          <div className="hidden w-[24%] space-y-2 border-l border-[var(--border)] bg-card p-2 lg:block">
            <Avatar initials="CR" color="#0052D9" />
            <Bar w="80%" h={4} />
            <Bar w="60%" h={3} />
            <div className="mt-2 flex gap-0.5">
              {["#0052D9", "#0052D9", "#E4E4E7", "#E4E4E7"].map((c, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="rounded-md bg-[var(--brand-blue-tint)] p-1.5 text-[8px] font-semibold text-[var(--brand-blue)]">
              Prochaine étape →
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 3. CRM ───────────────────────────────────────────────────────────────── */

export function CrmMockup() {
  const cols = [
    { name: "Nouveau", n: 3, c: "#94A0AE" },
    { name: "Contacté", n: 5, c: "#0A66C2" },
    { name: "Qualifié", n: 2, c: "#0052D9" },
    { name: "RDV", n: 4, c: "#FF6700" },
    { name: "Signé", n: 1, c: "#0E7A3A" },
  ];
  return (
    <Shell>
      <Sidebar active={1} />
      <div className="flex flex-1 flex-col">
        <Topbar title="CRM · Pipeline" />
        <div className="flex flex-1 gap-1.5 overflow-hidden p-2.5">
          {cols.map((col) => (
            <div key={col.name} className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[8px] font-semibold">
                  <Dot color={col.c} />
                  {col.name}
                </span>
                <span className="text-[8px] text-muted-foreground">{col.n}</span>
              </div>
              {Array.from({ length: col.n }).slice(0, 3).map((_, i) => (
                <div key={i} className="rounded-md border border-[var(--border)] bg-card p-1.5">
                  <div className="flex items-center gap-1">
                    <Avatar initials="··" color={col.c} />
                    <Bar w="60%" h={3} />
                  </div>
                  <span className="mt-1.5 block">
                    <Bar w="90%" h={2.5} />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ── 4. Calendar ──────────────────────────────────────────────────────────── */

export function CalendarMockup() {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  const events = [
    { d: 0, top: "20%", h: "22%", c: "#0052D9" },
    { d: 1, top: "45%", h: "18%", c: "#FF6700" },
    { d: 2, top: "12%", h: "26%", c: "#0052D9" },
    { d: 3, top: "55%", h: "20%", c: "#5B2EBF" },
    { d: 4, top: "30%", h: "30%", c: "#0E7A3A" },
    { d: 1, top: "70%", h: "16%", c: "#0052D9" },
  ];
  return (
    <Shell>
      <Sidebar active={5} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Calendrier" />
        <div className="flex-1 overflow-hidden p-2.5">
          <div className="mb-1.5 grid grid-cols-5 gap-1">
            {days.map((d) => (
              <div key={d} className="text-center text-[8px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="relative grid h-[78%] grid-cols-5 gap-1">
            {days.map((d, di) => (
              <div key={d} className="relative rounded-md border border-[var(--border)] bg-card">
                {events
                  .filter((e) => e.d === di)
                  .map((e, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0.5 rounded-sm px-1 py-0.5"
                      style={{ top: e.top, height: e.h, background: `${e.c}22`, borderLeft: `2px solid ${e.c}` }}
                    >
                      <span className="block h-1 w-3/4 rounded-full" style={{ background: e.c }} />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 5. Campaigns ─────────────────────────────────────────────────────────── */

export function CampaignsMockup() {
  const rows = [
    { n: "Prospection CTO SaaS Q2", ch: "#0A66C2", st: "En cours", sc: "#0E7A3A", p: 78 },
    { n: "Relance leads MQL février", ch: "#0A66C2", st: "En cours", sc: "#0E7A3A", p: 64 },
    { n: "Activation freemium WhatsApp", ch: "#25D366", st: "Pause", sc: "#9A6700", p: 50 },
    { n: "Outbound CFO scale-ups", ch: "#0A66C2", st: "Terminée", sc: "#6B7280", p: 100 },
  ];
  return (
    <Shell>
      <Sidebar active={2} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Campagnes & Appels" />
        <div className="flex-1 space-y-2 overflow-hidden p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Invitations", v: "412" },
              { l: "Taux accept.", v: "34%" },
              { l: "RDV bookés", v: "31" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-[var(--border)] bg-card p-1.5">
                <div className="text-[8px] text-muted-foreground">{k.l}</div>
                <div className="text-sm font-semibold tabular">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-card">
            {rows.map((r, i) => (
              <div
                key={r.n}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5",
                  i !== rows.length - 1 && "border-b border-[var(--border)]",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.ch }} />
                <span className="min-w-0 flex-1 truncate text-[9px] font-medium">{r.n}</span>
                <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-[var(--neutral-200)] sm:block">
                  <span className="block h-full rounded-full bg-[var(--brand-blue)]" style={{ width: `${r.p}%` }} />
                </div>
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-semibold"
                  style={{ background: `${r.sc}22`, color: r.sc }}
                >
                  {r.st}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 6. Workflows ─────────────────────────────────────────────────────────── */

export function WorkflowsMockup() {
  const nodes = [
    { tag: "Déclencheur", t: "RDV pris", c: "#5B2EBF" },
    { tag: "Délai", t: "Attendre 2h", c: "#D89B0A" },
    { tag: "Action", t: "Confirmation WhatsApp", c: "#25D366" },
    { tag: "Condition", t: "Réponse reçue ?", c: "#DC2626" },
  ];
  return (
    <Shell>
      <Sidebar active={3} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Workflows · Nouveau" />
        <div className="relative flex-1 overflow-hidden p-3">
          {/* faint grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative mx-auto flex max-w-[60%] flex-col items-center gap-1.5">
            {nodes.map((n, i) => (
              <div key={n.t} className="flex w-full flex-col items-center">
                <div className="w-full rounded-lg border border-[var(--border)] bg-card px-2 py-1.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="size-5 shrink-0 rounded-md" style={{ background: `${n.c}22` }}>
                      <span className="block size-full scale-[0.4] rounded" style={{ background: n.c }} />
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-[7px] font-bold uppercase tracking-wider"
                        style={{ color: n.c }}
                      >
                        {n.tag}
                      </div>
                      <div className="truncate text-[9px] font-semibold">{n.t}</div>
                    </div>
                  </div>
                </div>
                {i < nodes.length - 1 && (
                  <span className="h-2.5 w-px border-l border-dashed border-[var(--brand-blue)]/50" />
                )}
              </div>
            ))}
            <span className="mt-1 rounded-md border border-dashed border-[var(--border)] px-2 py-0.5 text-[8px] text-muted-foreground">
              + Ajouter une étape
            </span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 7. Chrome extension on a LinkedIn profile ────────────────────────────── */

export function ExtensionMockup() {
  return (
    <div className="absolute inset-0 select-none bg-[#F3F2EF]">
      {/* faux LinkedIn profile */}
      <div className="h-[28%] bg-gradient-to-r from-[#0A66C2] to-[#378FE9]" />
      <div className="px-4">
        <div className="-mt-6 size-12 rounded-full border-4 border-[#F3F2EF] bg-[#0052D9]" />
        <div className="mt-1.5">
          <Bar w={120} h={7} />
          <span className="mt-1.5 block">
            <Bar w={180} h={4} />
          </span>
          <span className="mt-1 block">
            <Bar w={90} h={4} />
          </span>
        </div>
        <div className="mt-3 space-y-1.5 rounded-lg bg-white p-2.5">
          <Bar w="70%" h={4} />
          <Bar w="90%" h={3} />
          <Bar w="60%" h={3} />
        </div>
      </div>
      {/* extension panel overlay */}
      <div className="absolute right-3 top-3 w-[42%] min-w-[150px] overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-1.5 bg-[var(--brand-blue)] px-2.5 py-1.5">
          <span className="grid size-4 place-items-center rounded bg-white/20 text-[8px] font-bold text-white">
            A
          </span>
          <span className="text-[9px] font-semibold text-white">Andoxa</span>
          <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[7px] font-medium text-white">
            Connecté
          </span>
        </div>
        <div className="space-y-2 p-2.5">
          <div className="flex items-center gap-1.5">
            <Avatar initials="CR" color="#0052D9" />
            <div className="min-w-0">
              <Bar w={80} h={4} />
              <span className="mt-1 block">
                <Bar w={60} h={3} />
              </span>
            </div>
          </div>
          <div className="rounded-md bg-[var(--neutral-50)] p-1.5">
            <span className="text-[7px] font-medium text-muted-foreground">Ajouter à une liste</span>
            <div className="mt-1">
              <Bar w="100%" h={5} />
            </div>
          </div>
          <div className="rounded-md bg-[var(--brand-blue)] py-1.5 text-center text-[8px] font-bold text-white">
            Transférer vers Andoxa
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 8. Call session ──────────────────────────────────────────────────────── */

export function SessionMockup() {
  return (
    <Shell className="flex-col">
      {/* session topbar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-card px-3 py-2">
        <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[8px] font-medium">
          ← Quitter
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[7px] font-semibold text-red-800">
          <Dot color="#DC2626" /> EN SESSION
        </span>
        <span className="text-[9px] font-semibold">Outbound — Achats BTP Q2</span>
        <span className="ml-auto text-[8px] tabular text-muted-foreground">7/12 · 32:14</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* queue rail */}
        <div className="w-[26%] space-y-1 border-r border-[var(--border)] bg-card p-1.5">
          {["Andréas B.", "Camille D.", "Hakim B.", "Sophie N."].map((n, i) => (
            <div
              key={n}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-1",
                i === 0 ? "bg-[var(--brand-blue-tint)] ring-1 ring-[var(--brand-blue)]" : "",
              )}
            >
              <span className="grid size-3.5 place-items-center rounded-full bg-[var(--neutral-200)] text-[7px] font-semibold">
                {i + 1}
              </span>
              <span className="truncate text-[8px] font-medium">{n}</span>
            </div>
          ))}
        </div>
        {/* focus + qual bar */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-hidden p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-card p-2">
              <span className="grid size-9 place-items-center rounded-full bg-[#0052D9] text-[10px] font-bold text-white">
                AB
              </span>
              <div className="min-w-0">
                <Bar w={110} h={5} />
                <span className="mt-1 block">
                  <Bar w={150} h={3.5} />
                </span>
              </div>
              <span className="ml-auto rounded-md bg-[var(--brand-blue)] px-2 py-1 text-[8px] font-bold text-white">
                Booker RDV
              </span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-card p-2">
              <div className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                Script
              </div>
              <div className="mt-1.5 space-y-1">
                <Bar w="95%" h={3} />
                <Bar w="100%" h={3} />
                <Bar w="80%" h={3} />
                <Bar w="90%" h={3} />
              </div>
            </div>
          </div>
          {/* qual bar */}
          <div className="flex flex-wrap gap-1 border-t border-[var(--border)] bg-card px-2 py-1.5">
            {[
              { t: "RDV pris", c: "#5B2EBF" },
              { t: "À rappeler", c: "#D89B0A" },
              { t: "Pas de réponse", c: "#6B7280" },
              { t: "Refus", c: "#991B1B" },
            ].map((b) => (
              <span
                key={b.t}
                className="rounded-md px-1.5 py-0.5 text-[7px] font-semibold"
                style={{ background: `${b.c}1f`, color: b.c }}
              >
                {b.t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── registry — handy for the guide's per-page loop ───────────────────────── */

export const PRODUCT_MOCKUPS = {
  dashboard: DashboardMockup,
  inbox: InboxMockup,
  crm: CrmMockup,
  calendar: CalendarMockup,
  campaigns: CampaignsMockup,
  workflows: WorkflowsMockup,
  extension: ExtensionMockup,
  session: SessionMockup,
} as const;

export type ProductMockupKey = keyof typeof PRODUCT_MOCKUPS;
