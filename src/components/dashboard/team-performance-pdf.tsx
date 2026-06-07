"use client";

/**
 * Team performance PDF export ("Performance de l'équipe — Prospection").
 *
 * A faithful @react-pdf/renderer rebuild of the design handoff (originally an
 * HTML/Tailwind prototype). One A4 page in the chosen orientation:
 *
 *   • Landscape — funnel and volume sit side by side.
 *   • Portrait  — they stack.
 *
 * All values come from /api/dashboard/team-export (org-wide = team-wide
 * aggregation) for the selected period, so every chart recomputes from the
 * real data and the time window. Charts are drawn with react-pdf SVG/View
 * primitives (no external chart lib, no SVG rasterisation needed).
 *
 * Brand mark: the public JPG mark (react-pdf rasterises JPG/PNG, not SVG).
 */

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Circle,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

// Wrap whole words instead of breaking mid-word (default react-pdf hyphenation
// would split short labels like "CLOSING" into "CLOS-ING").
Font.registerHyphenationCallback((word) => [word]);

import type { ApiPeriod, PdfOrientation } from "./dashboard-content";
import type { TeamExportData, TeamExportKpi } from "@/app/api/dashboard/team-export/route";

/**
 * Public PNG brand mark (react-pdf rasterises PNG/JPEG, not SVG). The asset is a
 * correctly-typed `.png`; as defense-in-depth `toDataUrl` below also sniffs the
 * real format from magic bytes, so a mislabeled asset (e.g. a PNG saved as
 * `.jpg`, served `image/jpeg`) can never silently break the embed again.
 */
const ANDOXA_MARK_PATH = "/assets/logofiles/andoxa-mark.png";

/* ============================ palette (from design tokens) ============================ */
const C = {
  ink: "#0a0a0a",
  muted: "#737373",
  line: "#e5e5e5",
  track: "#f0f0f0",
  card: "#ffffff",
  blue: "#0052D9",
  blueLight: "#1A6AFF",
  blueDark: "#003EA3",
  blueTint: "#E8F0FD",
  blueTint2: "#A9C7F7",
  okText: "#15803d",
  okTint: "#e7f6ec",
  badText: "#dc2626",
  badTint: "#fdecec",
} as const;

/**
 * French thousands formatting with the grouping space normalised to a regular
 * space — toLocaleString uses U+202F (narrow no-break), which the base PDF
 * font renders as a stray "/".
 */
function frNum(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ");
}

const PIPELINE_COLORS = [C.blueDark, C.blue, C.blueLight, C.blueTint2];
const VOLUME_COLORS: Record<"msg" | "app" | "rdv", string> = {
  msg: C.blue,
  app: C.blueLight,
  rdv: C.okText,
};

/* ============================ styles ============================ */
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
  },
  // header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: { width: 30, height: 30, borderRadius: 7, marginRight: 9 },
  eyebrow: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: C.muted,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 2,
  },
  metaCol: { flexDirection: "column", alignItems: "flex-end", rowGap: 2 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", columnGap: 5 },
  metaK: { fontSize: 8.5, color: C.muted },
  metaV: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.ink },
  // generic card
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    padding: 11,
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  sectionLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.ink },
  sectionHint: { fontSize: 7.5, color: C.muted },
  cardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink },
  cardSubtitle: { fontSize: 8, color: C.muted, marginTop: 2 },
  // kpi
  kpiRow: { flexDirection: "row", columnGap: 9 },
  kpiCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    padding: 9,
  },
  kpiTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: C.muted,
    textTransform: "uppercase",
    maxWidth: "62%",
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 2,
    borderRadius: 8,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
  },
  deltaText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  kpiMidRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 7,
  },
  kpiValue: { fontSize: 24, fontFamily: "Helvetica-Bold", color: C.ink },
  kpiUnit: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 7 },
  kpiSub: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  // funnel
  funnelRow: { marginBottom: 6 },
  funnelHead: { flexDirection: "row", alignItems: "center", columnGap: 4 },
  funnelN: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.muted, width: 9 },
  funnelLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink },
  passagePill: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    backgroundColor: C.blueTint,
    borderRadius: 7,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  funnelValue: {
    marginLeft: "auto",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  funnelTrack: {
    height: 6,
    backgroundColor: C.track,
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  funnelFill: { height: 6, backgroundColor: C.blue, borderRadius: 3 },
  summaryRow: {
    flexDirection: "row",
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    columnGap: 10,
  },
  summaryCell: { flex: 1 },
  summaryK: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: C.muted,
    textTransform: "uppercase",
  },
  summaryV: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 2 },
  // volume
  volChart: { flexDirection: "row", alignItems: "flex-end", columnGap: 8, marginTop: 10 },
  volCol: { flex: 1, alignItems: "center" },
  volBarArea: { width: "100%", alignItems: "center", justifyContent: "flex-end" },
  volBar: { width: 22, borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: "hidden" },
  volLabel: { fontSize: 7.5, color: C.muted, marginTop: 5 },
  legendRow: {
    flexDirection: "row",
    columnGap: 16,
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  legendItem: { flexDirection: "row", alignItems: "center", columnGap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 8, color: C.muted },
  legendVal: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink },
  // pipeline composition
  compHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  compBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: C.track,
    marginTop: 10,
  },
  compLegendRow: { flexDirection: "row", columnGap: 10, marginTop: 10 },
  compCell: { flex: 1 },
  compCellHead: { flexDirection: "row", alignItems: "center", columnGap: 5 },
  compDot: { width: 8, height: 8, borderRadius: 2 },
  compLabel: { fontSize: 8, color: C.muted },
  compValueRow: { flexDirection: "row", alignItems: "flex-end", columnGap: 4, marginTop: 3, marginLeft: 13 },
  compN: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.ink },
  compPct: { fontSize: 8, color: C.muted },
  // footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: C.line,
    fontSize: 7.5,
    color: C.muted,
  },
});

/* ============================ chart primitives ============================ */

function sparkPaths(data: number[], w: number, h: number, p = 3) {
  if (!data || data.length === 0) return null;
  const series = data.length === 1 ? [data[0], data[0]] : data;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const rng = max - min || 1;
  const pts = series.map(
    (v, i) =>
      [
        p + (i / (series.length - 1)) * (w - 2 * p),
        p + (1 - (v - min) / rng) * (h - 2 * p),
      ] as [number, number],
  );
  const line =
    "M" + pts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" L");
  const area =
    `M${pts[0][0].toFixed(1)},${h} L` +
    pts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" L") +
    ` L${pts[pts.length - 1][0].toFixed(1)},${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

function Spark({
  data,
  color = C.blue,
  w = 78,
  h = 26,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  const g = sparkPaths(data, w, h);
  if (!g) return <View style={{ width: w, height: h }} />;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={g.area} fill={color} fillOpacity={0.12} />
      <Path d={g.line} stroke={color} strokeWidth={1.6} fill="none" />
      <Circle cx={g.last[0]} cy={g.last[1]} r={1.8} fill={color} />
    </Svg>
  );
}

function TrendArrow({ dir, color }: { dir: "up" | "down" | "flat"; color: string }) {
  if (dir === "flat") return null;
  // Small triangle: up = pointing up, down = pointing down.
  const d = dir === "up" ? "M4,1 L7,6 L1,6 Z" : "M1,1 L7,1 L4,6 Z";
  return (
    <Svg width={8} height={7} viewBox="0 0 8 7">
      <Path d={d} fill={color} />
    </Svg>
  );
}

function DeltaPill({ delta }: { delta: TeamExportKpi["delta"] }) {
  const tone =
    delta.dir === "up"
      ? { bg: C.okTint, fg: C.okText }
      : delta.dir === "down"
        ? { bg: C.badTint, fg: C.badText }
        : { bg: C.track, fg: C.muted };
  return (
    <View style={[styles.deltaPill, { backgroundColor: tone.bg }]}>
      <TrendArrow dir={delta.dir} color={tone.fg} />
      <Text style={[styles.deltaText, { color: tone.fg }]}>{delta.text}</Text>
    </View>
  );
}

/* ============================ sections ============================ */

function ReportHeader({ data, brandMark }: { data: TeamExportData; brandMark: string | null }) {
  const n = data.org.memberCount;
  const commerciaux = `${n} ${n > 1 ? "commerciaux" : "commercial"}`;
  const teamLine = data.org.name ? `${data.org.name} · ${commerciaux}` : commerciaux;
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        {brandMark ? <Image style={styles.brandMark} src={brandMark} /> : null}
        <View>
          <Text style={styles.eyebrow}>
            Andoxa{data.org.name ? ` · ${data.org.name}` : ""}
          </Text>
          <Text style={styles.title}>Performance de l&apos;équipe — Prospection</Text>
        </View>
      </View>
      <View style={styles.metaCol}>
        <View style={styles.metaRow}>
          <Text style={styles.metaK}>Période</Text>
          <Text style={styles.metaV}>{data.periodLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaK}>Équipe</Text>
          <Text style={styles.metaV}>{teamLine}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaK}>Généré le</Text>
          <Text style={styles.metaV}>{data.generatedAt}</Text>
        </View>
      </View>
    </View>
  );
}

const KPI_META: { key: keyof TeamExportData["kpis"]; label: string; unit: string; sub: string }[] = [
  { key: "pipeline", label: "Pipeline actif", unit: "prospects en cours", sub: "Pipeline commercial de l'équipe" },
  { key: "closingRate", label: "Taux de closing", unit: "conversations » closing", sub: "Moyenne équipe pondérée" },
  { key: "closings", label: "Closings", unit: "deals gagnés", sub: "Affaires signées sur la période" },
  { key: "rdvBooked", label: "RDV bookés", unit: "rendez-vous planifiés", sub: "Depuis les conversations" },
];

function KpiBand({ data, land }: { data: TeamExportData; land: boolean }) {
  // Portrait packs 4 cards into ~535pt, so the value + sparkline must stay
  // narrow enough to never spill the card (which would visually overlap a
  // neighbour). Landscape has room to breathe.
  const valueSize = land ? 24 : 19;
  const sparkW = land ? 78 : 46;
  const sparkH = land ? 26 : 22;
  return (
    <View>
      <View style={styles.sectionHeadRow}>
        <Text style={styles.sectionLabel}>Indicateurs clés</Text>
        <Text style={styles.sectionHint}>Évolution vs période précédente</Text>
      </View>
      <View style={[styles.kpiRow, { columnGap: land ? 9 : 7 }]}>
        {KPI_META.map((m) => {
          const k = data.kpis[m.key];
          return (
            <View key={m.key} style={styles.kpiCard}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabel}>{m.label}</Text>
                <DeltaPill delta={k.delta} />
              </View>
              <View style={styles.kpiMidRow}>
                <Text style={[styles.kpiValue, { fontSize: valueSize, flexShrink: 1 }]}>
                  {k.display}
                </Text>
                <Spark data={k.spark} w={sparkW} h={sparkH} />
              </View>
              <Text style={styles.kpiUnit}>{m.unit}</Text>
              <Text style={styles.kpiSub}>{m.sub}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FunnelCard({ data }: { data: TeamExportData }) {
  const max = Math.max(...data.funnel.steps.map((s) => s.count), 1);
  return (
    <View style={[styles.card, { flex: 1, flexDirection: "column" }]}>
      <Text style={styles.cardTitle}>Funnel de conversion — équipe</Text>
      <Text style={styles.cardSubtitle}>Du premier contact au closing</Text>
      <View style={{ marginTop: 10 }}>
        {data.funnel.steps.map((s) => (
          <View key={s.n} style={styles.funnelRow}>
            <View style={styles.funnelHead}>
              <Text style={styles.funnelN}>{s.n}</Text>
              <Text style={styles.funnelLabel}>{s.label}</Text>
              {s.passage ? <Text style={styles.passagePill}>{s.passage}</Text> : null}
              <Text style={styles.funnelValue}>{s.display}</Text>
            </View>
            <View style={styles.funnelTrack}>
              <View
                style={[
                  styles.funnelFill,
                  { width: `${Math.max((s.count / max) * 100, 1.5).toFixed(1)}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.summaryRow}>
        {data.funnel.summary.map((s) => (
          <View key={s.key} style={styles.summaryCell}>
            <Text style={styles.summaryK}>{s.key}</Text>
            <Text style={styles.summaryV}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function VolumeCard({ data, barChartH }: { data: TeamExportData; barChartH: number }) {
  const weeks = data.volume.weeks;
  const maxTotal = Math.max(...weeks.map((w) => w.msg + w.app + w.rdv), 1);
  return (
    <View style={[styles.card, { flex: 1, flexDirection: "column" }]}>
      <Text style={styles.cardTitle}>Volume d&apos;activité — équipe</Text>
      <Text style={styles.cardSubtitle}>{data.volume.subtitle}</Text>
      <View style={[styles.volChart, { height: barChartH }]}>
        {weeks.map((w, i) => {
          const total = w.msg + w.app + w.rdv;
          const barH = total > 0 ? (total / maxTotal) * barChartH : 0;
          const seg = (v: number) =>
            total > 0 ? Math.max((v / total) * barH, v > 0 ? 2.5 : 0) : 0;
          return (
            <View key={i} style={styles.volCol}>
              <View style={[styles.volBarArea, { height: barChartH }]}>
                <View style={[styles.volBar, { height: barH }]}>
                  <View style={{ height: seg(w.rdv), backgroundColor: VOLUME_COLORS.rdv }} />
                  <View style={{ height: seg(w.app), backgroundColor: VOLUME_COLORS.app }} />
                  <View style={{ flexGrow: 1, backgroundColor: VOLUME_COLORS.msg }} />
                </View>
              </View>
              <Text style={styles.volLabel}>{w.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        {data.volume.legend.map((l) => (
          <View key={l.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: VOLUME_COLORS[l.key] }]} />
            <Text style={styles.legendLabel}>{l.label}</Text>
            <Text style={styles.legendVal}>{l.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChartsRow({ data, land }: { data: TeamExportData; land: boolean }) {
  const barChartH = land ? 116 : 92;
  return (
    <View
      style={{
        flexDirection: land ? "row" : "column",
        columnGap: land ? 12 : 0,
        rowGap: land ? 0 : 12,
        flexGrow: 1,
      }}
    >
      <FunnelCard data={data} />
      <VolumeCard data={data} barChartH={barChartH} />
    </View>
  );
}

function PipelineComposition({ data }: { data: TeamExportData }) {
  const comp = data.pipelineComposition;
  const total = comp.reduce((a, c) => a + c.n, 0);
  return (
    <View style={styles.card}>
      <View style={styles.compHeadRow}>
        <View>
          <Text style={styles.cardTitle}>Santé du pipeline</Text>
          <Text style={styles.cardSubtitle}>Composition du pipeline actif par étape</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          <Text style={{ fontFamily: "Helvetica-Bold", color: C.ink }}>{frNum(total)}</Text>{" "}
          prospects actifs
        </Text>
      </View>
      <View style={styles.compBar}>
        {comp.map((s, i) => (
          <View
            key={s.label}
            style={{ width: `${s.pct}%`, backgroundColor: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }}
          />
        ))}
      </View>
      <View style={styles.compLegendRow}>
        {comp.map((s, i) => (
          <View key={s.label} style={styles.compCell}>
            <View style={styles.compCellHead}>
              <View style={[styles.compDot, { backgroundColor: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }]} />
              <Text style={styles.compLabel}>{s.label}</Text>
            </View>
            <View style={styles.compValueRow}>
              <Text style={styles.compN}>{frNum(s.n)}</Text>
              <Text style={styles.compPct}>· {s.pct} %</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReportFooter({ data }: { data: TeamExportData }) {
  return (
    <View style={styles.footer}>
      <Text>Andoxa · Document confidentiel</Text>
      <Text>
        Rapport de performance équipe{data.org.name ? ` — ${data.org.name}` : ""}
      </Text>
      <Text>Page 1 / 1</Text>
    </View>
  );
}

/* ============================ document ============================ */

export function TeamPerformanceDocument({
  data,
  orientation,
  brandMark,
}: {
  data: TeamExportData;
  orientation: PdfOrientation;
  brandMark: string | null;
}) {
  const land = orientation === "landscape";
  return (
    <Document title={`Andoxa — Performance de l'équipe (${data.periodLabel})`} author="Andoxa">
      <Page
        size="A4"
        orientation={orientation}
        style={[
          styles.page,
          {
            paddingTop: land ? 20 : 26,
            paddingBottom: land ? 14 : 18,
            paddingHorizontal: land ? 28 : 30,
            rowGap: land ? 11 : 13,
          },
        ]}
      >
        <ReportHeader data={data} brandMark={brandMark} />
        <KpiBand data={data} land={land} />
        <ChartsRow data={data} land={land} />
        <PipelineComposition data={data} />
        <ReportFooter data={data} />
      </Page>
    </Document>
  );
}

/* ============================ data fetch + export ============================ */

/**
 * Sniff the real image type from magic bytes. The server's Content-Type (and
 * thus FileReader's data-URL prefix) follows the file *extension*, which can lie
 * — a PNG saved as `.jpg` is served `image/jpeg`, and react-pdf then fails to
 * decode it. Deriving the MIME from the actual bytes makes the embed robust to
 * mislabeled assets.
 */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

async function toDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    const mime =
      sniffImageMime(bytes) ?? res.headers.get("content-type") ?? "image/png";
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export async function exportTeamPerformancePdf({
  apiPeriod,
  orientation = "portrait",
}: {
  apiPeriod: ApiPeriod;
  orientation?: PdfOrientation;
}) {
  const [dataRes, brandMark] = await Promise.all([
    fetch(`/api/dashboard/team-export?period=${apiPeriod}`, {
      credentials: "include",
    }),
    toDataUrl(ANDOXA_MARK_PATH),
  ]);

  if (!dataRes.ok) {
    throw new Error(`team-export fetch failed: ${dataRes.status}`);
  }
  const json = await dataRes.json();
  const data = (json.data ?? json) as TeamExportData;

  const blob = await pdf(
    <TeamPerformanceDocument data={data} orientation={orientation} brandMark={brandMark} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const orient = orientation === "landscape" ? "paysage" : "portrait";
  a.download = `andoxa-equipe-${apiPeriod}-${orient}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
