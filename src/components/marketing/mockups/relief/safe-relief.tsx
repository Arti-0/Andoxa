"use client";

import * as React from "react";
import {
  Clock,
  Eye,
  Gauge,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  UserRound,
} from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import { useReliefScale } from "./use-relief-scale";
import styles from "./safe-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** "LinkedIn Safe" relief: a "compte" security dashboard (daily usage well under
 *  LinkedIn limits) with a floating "LinkedIn Safe" seal. Decorative → aria-hidden.
 *  Copy stays honest: no "zéro risque / compte protégé" promise (CLAUDE.md). */
export function SafeRelief({ className }: { className?: string }) {
  const ref = useReliefScale(1040);
  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Fenêtre principale : tableau de bord sécurité */}
          <div className={j(s.layer, s.winFront)}>
            <div className={s.winBar}>
              <span className={s.mark}>
                <AndoxaLogoIcon style={{ width: 22, height: 22 }} />
              </span>
              <span className={s.title}>Sécurité du compte</span>
              <span className={s.pillOk}>
                <span className={s.d} />
                Dans les limites
              </span>
            </div>

            <div className={s.body}>
              <div className={s.intro}>
                <span className={s.shield}>
                  <ShieldCheck />
                </span>
                <div>
                  <h3>Limites LinkedIn respectées</h3>
                  <p>Usage du jour bien en dessous des seuils recommandés</p>
                </div>
              </div>

              <div className={s.gauge}>
                <div className={s.gaugeTop}>
                  <span className={s.gaugeLabel}>
                    <UserPlus />
                    Invitations · aujourd&apos;hui
                  </span>
                  <span className={s.gaugeVal}>
                    <strong>58</strong> / 80
                  </span>
                </div>
                <div className={s.gaugeTrack}>
                  <div className={s.gaugeFill} style={{ width: "72%" }} />
                </div>
                <div className={s.gaugeCap}>Zone sûre · marge avant la limite quotidienne</div>
              </div>

              <div className={s.gauge}>
                <div className={s.gaugeTop}>
                  <span className={s.gaugeLabel}>
                    <MessageCircle />
                    Messages · aujourd&apos;hui
                  </span>
                  <span className={s.gaugeVal}>
                    <strong>60</strong> / 100
                  </span>
                </div>
                <div className={s.gaugeTrack}>
                  <div className={s.gaugeFill} style={{ width: "60%" }} />
                </div>
                <div className={s.gaugeCap}>Zone sûre · cadence étalée sur la journée</div>
              </div>

              <div className={s.gauge}>
                <div className={s.gaugeTop}>
                  <span className={s.gaugeLabel}>
                    <Eye />
                    Visites de profil · aujourd&apos;hui
                  </span>
                  <span className={s.gaugeVal}>
                    <strong>50</strong> / 80
                  </span>
                </div>
                <div className={s.gaugeTrack}>
                  <div className={s.gaugeFill} style={{ width: "63%" }} />
                </div>
                <div className={s.gaugeCap}>Zone sûre · rythme proche d&apos;un usage humain</div>
              </div>

              <div className={s.chips}>
                <div className={s.chip}>
                  <span className={s.ic}><UserRound /></span>
                  Cadence humaine
                </div>
                <div className={s.chip}>
                  <span className={s.ic}><Clock /></span>
                  Envois espacés
                </div>
                <div className={s.chip}>
                  <span className={s.ic}><Gauge /></span>
                  Plafonds quotidiens
                </div>
                <div className={s.chip}>
                  <span className={s.ic}><TrendingUp /></span>
                  Montée en charge douce
                </div>
              </div>
            </div>
          </div>

          {/* Sceau flottant LinkedIn Safe */}
          <div className={s.seal}>
            <div className={s.sealBadge}>
              <ShieldCheck />
            </div>
            <h4>LinkedIn Safe</h4>
            <p>Vos quotas surveillés en continu, sous les limites de LinkedIn.</p>
            <span className={s.sealLive}>
              <span className={s.pulse} />
              Surveillance active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
