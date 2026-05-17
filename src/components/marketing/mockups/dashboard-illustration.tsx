/**
 * Abstract dashboard illustration for the homepage "La solution" section.
 *
 * Not a literal screenshot — a stylised composition of overlapping floating
 * widgets (soft shadows), vibrant simplified data viz, an oversized positive
 * hero metric, and thick rounded skeleton pills instead of text. Mirrors the
 * *shape* of the real /dashboard (hero KPI, doughnut, trend, priorities) while
 * staying geometric and clean.
 */
import {
  Canvas,
  Doughnut,
  FloatingWidget,
  HeroMetric,
  MiniBars,
  Pill,
  Wave,
} from "./abstract";

export function DashboardIllustration() {
  return (
    <Canvas className="bg-gradient-to-br from-[var(--brand-blue-tint)]/70 via-background to-[var(--brand-orange-tint)]/30">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[var(--brand-blue)]/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-0 h-44 w-44 rounded-full bg-[var(--brand-orange)]/12 blur-2xl" />

      {/* hero metric — biggest, back-left */}
      <FloatingWidget className="left-[6%] top-[12%] w-[46%]" rotate={-3} z={1}>
        <Pill w="55%" h={7} />
        <div className="mt-2.5">
          <HeroMetric value="+82 k€" delta="+12% ce mois" color="var(--brand-blue)" size={38} />
        </div>
        <div className="mt-3 h-9">
          <Wave color="var(--brand-blue)" height={36} />
        </div>
      </FloatingWidget>

      {/* doughnut — top-right, overlapping */}
      <FloatingWidget className="right-[5%] top-[8%] w-[34%]" rotate={4} z={3}>
        <Pill w="60%" h={6} />
        <div className="mt-2 flex items-center gap-3">
          <Doughnut
            value={68}
            size={62}
            color="var(--brand-blue)"
            label={
              <span className="font-display text-[15px] font-semibold tabular text-foreground">
                68%
              </span>
            }
          />
          <div className="flex-1 space-y-1.5">
            <Pill w="100%" h={6} tone="soft" />
            <Pill w="75%" h={6} />
            <Pill w="88%" h={6} />
          </div>
        </div>
      </FloatingWidget>

      {/* priorities skeleton list — bottom-left, front */}
      <FloatingWidget className="bottom-[10%] left-[10%] w-[40%]" rotate={2} z={4}>
        <Pill w="45%" h={6} tone="brand" />
        <div className="mt-2.5 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="size-4 shrink-0 rounded-md"
                style={{ background: ["#0052D9", "#FF6700", "#0E7A3A"][i] + "33" }}
              />
              <Pill w={`${[85, 70, 92][i]}%`} h={7} />
            </div>
          ))}
        </div>
      </FloatingWidget>

      {/* mini bar chart — bottom-right, overlapping */}
      <FloatingWidget className="bottom-[14%] right-[8%] w-[30%]" rotate={-5} z={5}>
        <Pill w="65%" h={6} />
        <div className="mt-2 flex items-end gap-2">
          <HeroMetric value="38" delta="RDV" color="var(--brand-orange)" size={26} />
          <div className="h-10 flex-1">
            <MiniBars values={[3, 5, 4, 7, 6, 9]} color="var(--brand-orange)" className="h-full" />
          </div>
        </div>
      </FloatingWidget>

      {/* tiny accent chip — floats over the seam */}
      <FloatingWidget className="left-[44%] top-[46%] w-[22%] p-2.5" rotate={6} z={6}>
        <div className="flex items-center gap-2">
          <Doughnut value={82} size={34} thickness={6} color="var(--brand-orange)" />
          <div className="flex-1 space-y-1">
            <Pill w="100%" h={5} />
            <Pill w="60%" h={5} tone="soft" />
          </div>
        </div>
      </FloatingWidget>
    </Canvas>
  );
}
