"use client";

/**
 * Dashboard PDF export.
 *
 * Generates a multi-page PDF from the live dashboard data using
 * @react-pdf/renderer. Triggered from the dashboard header's export menu,
 * which offers both a vertical (portrait) and horizontal (landscape) layout,
 * each scoped to the chosen period.
 *
 * Branding:
 *   • The Andoxa logo (PNG mark) is rendered in the header.
 *   • The organisation's own logo/avatar is shown alongside its name.
 *   • Images are pre-fetched to data URLs so a broken/remote image can never
 *     throw mid-render and abort the whole export.
 *
 * @react-pdf/renderer cannot rasterise SVG, so we use a PNG brand mark
 * rather than the SVG wordmark assets.
 */

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

import type { ApiPeriod } from "./dashboard-content";

export type PdfOrientation = "portrait" | "landscape";

/** Public raster brand mark (PNG). SVG assets are not supported by react-pdf. */
const ANDOXA_MARK_PATH = "/assets/logofiles/logo-mark.png";

/* ============================================================
   TYPES (subset of the dashboard API payloads we need)
   ============================================================ */

interface ExportStats {
  pipeline: { active_total: number; trend_pts: number };
  rdv: { booked_count: number; trend_pts: number };
  linkedin: { response_rate_pct: number; trend_pts: number };
  closings: { won_count: number; trend_pts: number };
}

interface ExportPayload {
  generatedAt: string;
  period: string;
  orientation: PdfOrientation;
  /** Andoxa PNG mark as a data URL (null if it could not be loaded). */
  brandMark: string | null;
  /** Organisation logo/avatar as a data URL (null when unavailable). */
  orgLogo: string | null;
  orgName: string | null;
  stats: ExportStats | null;
  funnel: { steps: { label: string; count: number }[] } | null;
  topDeals: { name: string; company: string | null; stage_label: string }[];
  quotas: { label: string; used: number; max: number }[] | null;
}

/* ============================================================
   STYLES
   ============================================================ */

const COLORS = {
  brand: "#0052D9",
  brandSoft: "#E8F0FD",
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  lineSoft: "#f1f5f9",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `2 solid ${COLORS.brand}`,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: { width: 28, height: 28, borderRadius: 6, marginRight: 9 },
  brandWordmark: { fontSize: 20, fontFamily: "Helvetica-Bold", color: COLORS.brand },
  subtitle: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  orgBlock: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  orgLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 7,
    objectFit: "cover",
  },
  orgInitial: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 7,
    backgroundColor: COLORS.brandSoft,
    color: COLORS.brand,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 6,
  },
  orgName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  periodTag: {
    fontSize: 9,
    color: COLORS.brand,
    backgroundColor: COLORS.brandSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    color: COLORS.ink,
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap" },
  kpiCard: {
    border: `1 solid ${COLORS.line}`,
    borderRadius: 6,
    padding: 12,
    margin: "0 1% 10 0",
  },
  kpiLabel: { fontSize: 9, color: COLORS.muted, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: `1 solid ${COLORS.lineSoft}`,
  },
  rowStrong: { fontFamily: "Helvetica-Bold" },
  quotaRow: { marginBottom: 8 },
  quotaHead: { flexDirection: "row", justifyContent: "space-between" },
  quotaBarBg: {
    height: 6,
    backgroundColor: COLORS.lineSoft,
    borderRadius: 3,
    marginTop: 3,
  },
  quotaBarFill: { height: 6, backgroundColor: COLORS.brand, borderRadius: 3 },
  muted: { color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.faint,
    borderTop: `1 solid ${COLORS.line}`,
    paddingTop: 8,
  },
});

/* ============================================================
   DOCUMENT
   ============================================================ */

function Header({ data }: { data: ExportPayload }) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.brandRow}>
          {data.brandMark ? (
            <Image style={styles.brandMark} src={data.brandMark} />
          ) : null}
          <Text style={styles.brandWordmark}>Andoxa</Text>
        </View>
        <Text style={styles.subtitle}>Tableau de bord commercial</Text>
      </View>
      <View style={styles.headerRight}>
        {(data.orgName || data.orgLogo) && (
          <View style={styles.orgBlock}>
            {data.orgLogo ? (
              <Image style={styles.orgLogo} src={data.orgLogo} />
            ) : (
              <Text style={styles.orgInitial}>
                {(data.orgName ?? "?").charAt(0).toUpperCase()}
              </Text>
            )}
            {data.orgName ? (
              <Text style={styles.orgName}>{data.orgName}</Text>
            ) : null}
          </View>
        )}
        <Text style={styles.periodTag}>{data.period}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Généré par Andoxa · andoxa.fr</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function KpiBlock({
  label,
  value,
  width,
}: {
  label: string;
  value: string | number;
  width: string;
}) {
  return (
    <View style={[styles.kpiCard, { width }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{String(value)}</Text>
    </View>
  );
}

function DashboardPdfDocument({ data }: { data: ExportPayload }) {
  // Landscape fits 4 KPI cards across; portrait fits 2.
  const kpiWidth = data.orientation === "landscape" ? "24%" : "49%";

  return (
    <Document
      title={`Andoxa — Tableau de bord (${data.period})`}
      author="Andoxa"
    >
      <Page size="A4" orientation={data.orientation} style={styles.page}>
        <Header data={data} />

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicateurs clés</Text>
          <View style={styles.kpiGrid}>
            <KpiBlock
              label="Pipeline actif"
              value={data.stats?.pipeline.active_total ?? 0}
              width={kpiWidth}
            />
            <KpiBlock
              label="RDV bookés"
              value={data.stats?.rdv.booked_count ?? 0}
              width={kpiWidth}
            />
            <KpiBlock
              label="Taux réponse LinkedIn"
              value={`${data.stats?.linkedin.response_rate_pct ?? 0}%`}
              width={kpiWidth}
            />
            <KpiBlock
              label="Closings"
              value={data.stats?.closings.won_count ?? 0}
              width={kpiWidth}
            />
          </View>
        </View>

        {/* Funnel */}
        {data.funnel && data.funnel.steps.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Funnel de conversion</Text>
            {data.funnel.steps.map((s, i) => (
              <View key={i} style={styles.row}>
                <Text>{s.label}</Text>
                <Text style={styles.rowStrong}>{s.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top deals */}
        {data.topDeals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top deals en cours</Text>
            {data.topDeals.map((d, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text>
                  {d.name}
                  {d.company ? ` · ${d.company}` : ""}
                </Text>
                <Text style={styles.muted}>{d.stage_label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quotas */}
        {data.quotas && data.quotas.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Quotas LinkedIn</Text>
            {data.quotas.map((q, i) => {
              const pct = q.max ? Math.min((q.used / q.max) * 100, 100) : 0;
              return (
                <View key={i} style={styles.quotaRow}>
                  <View style={styles.quotaHead}>
                    <Text>{q.label}</Text>
                    <Text style={styles.muted}>
                      {q.used} / {q.max}
                    </Text>
                  </View>
                  <View style={styles.quotaBarBg}>
                    <View style={[styles.quotaBarFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Footer />
      </Page>
    </Document>
  );
}

/* ============================================================
   DATA FETCH + EXPORT
   ============================================================ */

/**
 * Fetch an image and convert it to a data URL. Returns null on any failure so
 * the caller can render a fallback instead of crashing the PDF pipeline.
 */
async function toDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) ?? null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchExportData(
  apiPeriod: ApiPeriod,
  periodLabel: string,
  orientation: PdfOrientation,
  org: { name: string | null; logoUrl: string | null },
): Promise<ExportPayload> {
  const [statsRes, funnelRes, dealsRes, usageRes, brandMark, orgLogo] =
    await Promise.all([
      fetch(`/api/dashboard/stats?period=${apiPeriod}`, {
        credentials: "include",
      }),
      fetch(`/api/dashboard/funnel?period=${apiPeriod}`, {
        credentials: "include",
      }),
      fetch(`/api/dashboard/top-deals?limit=5`, { credentials: "include" }),
      fetch(`/api/dashboard/linkedin-usage`, { credentials: "include" }),
      toDataUrl(ANDOXA_MARK_PATH),
      toDataUrl(org.logoUrl),
    ]);

  const statsJson = statsRes.ok ? await statsRes.json() : null;
  const funnelJson = funnelRes.ok ? await funnelRes.json() : null;
  const dealsJson = dealsRes.ok ? await dealsRes.json() : null;
  const usageJson = usageRes.ok ? await usageRes.json() : null;

  const stats = statsJson?.data ?? statsJson ?? null;
  const funnelRaw = funnelJson?.data ?? funnelJson ?? null;
  const deals = dealsJson?.data ?? dealsJson ?? [];
  const usage = usageJson?.data ?? usageJson ?? null;

  // The funnel API returns { steps: [{ label, count }] }.
  const funnel =
    funnelRaw && Array.isArray(funnelRaw.steps)
      ? {
          steps: funnelRaw.steps.map(
            (s: { label: string; count: number }) => ({
              label: s.label,
              count: s.count,
            }),
          ),
        }
      : null;

  const quotas = usage
    ? [
        {
          label: "Invitations",
          used: usage.invitations_sent ?? 0,
          max: usage.invitations_max ?? 100,
        },
        {
          label: "Messages",
          used: usage.messages_sent ?? 0,
          max: usage.messages_max ?? 100,
        },
      ]
    : null;

  return {
    generatedAt: new Date().toLocaleString("fr-FR"),
    period: periodLabel,
    orientation,
    brandMark,
    orgLogo,
    orgName: org.name,
    stats,
    funnel,
    topDeals: deals,
    quotas,
  };
}

export async function exportDashboardPdf({
  period,
  apiPeriod,
  orientation = "portrait",
  orgName = null,
  orgLogoUrl = null,
}: {
  period: string;
  apiPeriod: ApiPeriod;
  orientation?: PdfOrientation;
  orgName?: string | null;
  orgLogoUrl?: string | null;
}) {
  const data = await fetchExportData(apiPeriod, period, orientation, {
    name: orgName,
    logoUrl: orgLogoUrl,
  });
  const blob = await pdf(<DashboardPdfDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const orient = orientation === "landscape" ? "paysage" : "portrait";
  a.download = `andoxa-dashboard-${apiPeriod}-${orient}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
