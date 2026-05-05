"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// Données minimales nécessaires au PDF (sous-ensemble des types existants).
export interface DashboardPdfData {
  periodLabel: string;
  exportedAt: Date;
  firstName: string;
  stats: {
    pipeline: { active_total: number; by_stage: { rdv: number; proposal: number; qualified: number }; trend_pts: number };
    rdv: { booked_count: number; target: number; realisation_pct: number; trend_pts: number };
    linkedin: { messages_sent: number; response_rate_pct: number; acceptance_rate_pct: number; trend_pts: number };
    closings: { won_count: number; target: number; progress_pct: number; trend_pts: number };
  };
  funnel: {
    steps: Array<{ key: string; label: string; count: number; conversion_pct_from_prev: number | null }>;
    global_rate_pct: number;
    avg_cycle_days: number | null;
  };
  topDeals: Array<{
    name: string;
    company: string | null;
    stage_label: string;
    last_activity_label: string;
  }>;
}

const ANDOXA_BLUE = "#0052D9";
const TEXT = "#0F172A";
const TEXT_SOFT = "#334155";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const BORDER = "#E2E8F0";
const TINT = "#EEF4FE";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 30,
    fontSize: 10,
    color: TEXT,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 11,
    borderBottom: `1px solid ${BORDER}`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 95,
    height: 27,
    objectFit: "contain",
  },
  headerDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 9.5,
    color: MUTED,
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaPeriod: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: ANDOXA_BLUE,
    marginBottom: 2,
  },
  metaLine: {
    fontSize: 8.5,
    color: MUTED,
  },
  // KPI grid (2x2)
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: 11,
  },
  kpiHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
  },
  kpiSub: {
    marginTop: 3,
    fontSize: 9,
    color: MUTED,
  },
  kpiSide: {
    marginTop: 6,
    paddingTop: 5,
    borderTop: `1px solid ${BORDER}`,
    fontSize: 8,
    color: FAINT,
  },
  trendUp: {
    color: "#059669",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  trendDown: {
    color: "#DC2626",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  trendFlat: {
    color: FAINT,
    fontSize: 9,
  },
  // Section
  sectionCard: {
    marginTop: 10,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: 11,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
  },
  sectionSubtitle: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 1.5,
  },
  // Funnel
  funnelStep: {
    marginTop: 7,
  },
  funnelStepHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  funnelStepLabel: {
    fontSize: 9.5,
    color: TEXT,
    fontFamily: "Helvetica-Bold",
  },
  funnelStepConversion: {
    fontSize: 8,
    color: ANDOXA_BLUE,
    fontFamily: "Helvetica-Bold",
  },
  funnelStepCount: {
    fontSize: 10.5,
    color: TEXT,
    fontFamily: "Helvetica-Bold",
  },
  funnelBarTrack: {
    height: 11,
    borderRadius: 3,
    backgroundColor: TINT,
    overflow: "hidden",
  },
  funnelBarFill: {
    height: 11,
    borderRadius: 3,
    backgroundColor: ANDOXA_BLUE,
  },
  funnelStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
    paddingTop: 8,
    borderTop: `1px solid ${BORDER}`,
  },
  funnelStat: {
    flex: 1,
  },
  funnelStatLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },
  funnelStatValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
  },
  // Top deals table
  dealHeader: {
    flexDirection: "row",
    paddingVertical: 5.5,
    borderBottom: `1px solid ${BORDER}`,
  },
  dealHeaderCell: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },
  dealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6.5,
    borderBottom: `1px solid ${BORDER}`,
  },
  dealRowLast: {
    borderBottom: 0,
  },
  dealName: {
    flex: 2,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
  },
  dealCompany: {
    flex: 2,
    fontSize: 9,
    color: TEXT_SOFT,
  },
  dealStage: {
    flex: 1.2,
    fontSize: 8.5,
    color: ANDOXA_BLUE,
    fontFamily: "Helvetica-Bold",
  },
  dealActivity: {
    flex: 1.5,
    fontSize: 8.5,
    color: MUTED,
    textAlign: "right",
  },
  dealEmpty: {
    fontSize: 9,
    color: MUTED,
    fontStyle: "italic",
    paddingVertical: 12,
    textAlign: "center",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 7,
    borderTop: `1px solid ${BORDER}`,
  },
  footerText: {
    fontSize: 7.5,
    color: FAINT,
  },
});

function formatTrend(delta: number) {
  if (delta === 0) return { label: "— pts", style: styles.trendFlat };
  const sign = delta > 0 ? "+" : "";
  return {
    label: `${sign}${delta} pts`,
    style: delta > 0 ? styles.trendUp : styles.trendDown,
  };
}

function formatExportDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function KpiBlock({
  label,
  value,
  sub,
  side,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  side: string;
  trend: number;
}) {
  const t = formatTrend(trend);
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeadRow}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={t.style}>{t.label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
      <Text style={styles.kpiSide}>{side}</Text>
    </View>
  );
}

function DashboardPdfDoc({ data, logoUrl }: { data: DashboardPdfData; logoUrl: string | null }) {
  const { stats, funnel, topDeals, periodLabel, exportedAt, firstName } = data;
  const firstStepCount = funnel.steps[0]?.count ?? 0;
  const MIN_W = 14;

  return (
    <Document
      title={`Andoxa Dashboard — ${periodLabel}`}
      author="Andoxa"
      subject={`Tableau de bord — ${periodLabel}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View style={styles.headerDivider} />
            <View>
              <Text style={styles.title}>Tableau de bord</Text>
              <Text style={styles.subtitle}>
                {firstName ? `Bonjour ${firstName}` : "Synthèse commerciale"}
              </Text>
            </View>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaPeriod}>{periodLabel}</Text>
            <Text style={styles.metaLine}>Exporté le {formatExportDate(exportedAt)}</Text>
          </View>
        </View>

        {/* KPI grid 2x2 */}
        <View style={styles.kpiRow}>
          <KpiBlock
            label="Pipeline actif"
            value={String(stats.pipeline.active_total)}
            sub="prospects en cours"
            side={`${stats.pipeline.by_stage.proposal} en proposition · ${stats.pipeline.by_stage.qualified} qualifiés · ${stats.pipeline.by_stage.rdv} en RDV`}
            trend={stats.pipeline.trend_pts}
          />
          <KpiBlock
            label="RDV bookés"
            value={String(stats.rdv.booked_count)}
            sub={`${stats.rdv.realisation_pct}% de l'objectif`}
            side={`vs objectif ${stats.rdv.target}`}
            trend={stats.rdv.trend_pts}
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiBlock
            label="Taux de réponse LinkedIn"
            value={`${stats.linkedin.response_rate_pct}%`}
            sub={`sur ${stats.linkedin.messages_sent} message${stats.linkedin.messages_sent > 1 ? "s" : ""}`}
            side={`Acceptation ${stats.linkedin.acceptance_rate_pct}%`}
            trend={stats.linkedin.trend_pts}
          />
          <KpiBlock
            label="Closings"
            value={String(stats.closings.won_count)}
            sub={`vs objectif ${stats.closings.target}`}
            side={`${stats.closings.progress_pct}% de l'objectif`}
            trend={stats.closings.trend_pts}
          />
        </View>

        {/* Funnel */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Funnel de conversion</Text>
              <Text style={styles.sectionSubtitle}>Du premier contact au closing</Text>
            </View>
          </View>

          {funnel.steps.map((s, i) => {
            const raw = firstStepCount > 0 ? (s.count / firstStepCount) * 100 : 0;
            const widthPct = firstStepCount > 0 ? MIN_W + (raw / 100) * (100 - MIN_W) : MIN_W;
            return (
              <View key={s.key} style={styles.funnelStep}>
                <View style={styles.funnelStepHead}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                    <Text style={styles.funnelStepLabel}>
                      {i + 1}. {s.label}
                    </Text>
                    {s.conversion_pct_from_prev != null && (
                      <Text style={styles.funnelStepConversion}>
                        {s.conversion_pct_from_prev}%
                      </Text>
                    )}
                  </View>
                  <Text style={styles.funnelStepCount}>{s.count}</Text>
                </View>
                <View style={styles.funnelBarTrack}>
                  <View style={{ ...styles.funnelBarFill, width: `${widthPct}%` }} />
                </View>
              </View>
            );
          })}

          <View style={styles.funnelStats}>
            <View style={styles.funnelStat}>
              <Text style={styles.funnelStatLabel}>Taux global</Text>
              <Text style={styles.funnelStatValue}>{funnel.global_rate_pct}%</Text>
            </View>
            <View style={styles.funnelStat}>
              <Text style={styles.funnelStatLabel}>Cycle moyen</Text>
              <Text style={styles.funnelStatValue}>
                {funnel.avg_cycle_days != null ? `${funnel.avg_cycle_days} j` : "—"}
              </Text>
            </View>
            <View style={styles.funnelStat}>
              <Text style={styles.funnelStatLabel}>Étapes</Text>
              <Text style={styles.funnelStatValue}>{funnel.steps.length}</Text>
            </View>
          </View>
        </View>

        {/* Top deals */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Top deals en cours</Text>
              <Text style={styles.sectionSubtitle}>5 prospects les plus chauds</Text>
            </View>
          </View>

          <View style={{ marginTop: 6 }}>
            {topDeals.length === 0 ? (
              <Text style={styles.dealEmpty}>Aucun deal actif pour cette période.</Text>
            ) : (
              <>
                <View style={styles.dealHeader}>
                  <Text style={[styles.dealHeaderCell, { flex: 2 }]}>Prospect</Text>
                  <Text style={[styles.dealHeaderCell, { flex: 2 }]}>Entreprise</Text>
                  <Text style={[styles.dealHeaderCell, { flex: 1.2 }]}>Stage</Text>
                  <Text style={[styles.dealHeaderCell, { flex: 1.5, textAlign: "right" }]}>Activité</Text>
                </View>
                {topDeals.slice(0, 5).map((d, i, arr) => (
                  <View
                    key={`${d.name}-${i}`}
                    style={[
                      styles.dealRow,
                      i === arr.length - 1 ? styles.dealRowLast : {},
                    ]}
                  >
                    <Text style={styles.dealName}>{d.name}</Text>
                    <Text style={styles.dealCompany}>{d.company ?? "—"}</Text>
                    <Text style={styles.dealStage}>{d.stage_label}</Text>
                    <Text style={styles.dealActivity}>{d.last_activity_label}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Généré par Andoxa · andoxa.com</Text>
          <Text style={styles.footerText}>Document confidentiel</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

function slugifyPeriod(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Charge le logo en data URI pour qu'il soit embarqué dans le PDF (évite les
// soucis CORS / chargements asynchrones côté react-pdf).
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/assets/logofiles/logo_1.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportDashboardPDF(data: DashboardPdfData): Promise<void> {
  const logoUrl = await loadLogoDataUrl();
  const blob = await pdf(<DashboardPdfDoc data={data} logoUrl={logoUrl} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `andoxa-dashboard-${slugifyPeriod(data.periodLabel)}-${isoDate(data.exportedAt)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Libère le blob après quelques secondes pour laisser le navigateur télécharger.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
