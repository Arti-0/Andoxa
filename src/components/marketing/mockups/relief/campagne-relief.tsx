"use client";

import * as React from "react";
import { ArrowRight, Calendar, LayoutGrid, MessageSquare, Phone, TrendingUp, Users, X } from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import { useReliefScale } from "./use-relief-scale";
import styles from "./campagne-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** "Campagne LinkedIn" relief mockup: live funnel tracking (front) + the
 *  create-campaign wizard (floating hero). Decorative → aria-hidden. */
export function CampagneRelief({ className }: { className?: string }) {
  const ref = useReliefScale(1080);
  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Depth layers (skeleton) */}
          <div className={j(s.layer, s.winBack)}>
            <div className={s.winBar}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 60 }} /><span className={s.tab} style={{ width: 40 }} /><span className={s.tab} style={{ width: 48 }} />
            </div>
          </div>
          <div className={j(s.layer, s.winMid)}>
            <div className={j(s.winBar, s.brand)}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 64 }} /><span className={s.tab} style={{ width: 44 }} /><span className={s.tab} style={{ width: 52 }} />
            </div>
          </div>

          {/* Front: campaign tracking */}
          <div className={j(s.layer, s.winFront)}>
            <div className={s.winBar}>
              <span className={s.dotdot} /><span className={s.dotdot} /><span className={s.dotdot} />
              <span className={s.wtitle}>Andoxa · Campagnes &amp; Appels</span>
            </div>
            <div className={s.app}>
              <nav className={s.rail}>
                <span className={s.rmark}><AndoxaLogoIcon style={{ width: 28, height: 28 }} /></span>
                <span className={s.ritem}><LayoutGrid /></span>
                <span className={s.ritem}><Users /></span>
                <span className={j(s.ritem, s.active)}><Phone /></span>
                <span className={s.ritem}><MessageSquare /></span>
                <span className={s.ritem}><Calendar /></span>
                <span className={s.rspacer} />
                <span className={s.ravatar}>MD</span>
              </nav>

              <div className={s.cd}>
                <div className={s.cdTitleRow}>
                  <span className={s.cdTitle}>Prospection CTO SaaS Q2 2026</span>
                  <span className={j(s.tag, s.li)}><span className={s.liSq}>in</span>LinkedIn</span>
                  <span className={j(s.tag, s.im)}>Invitation + Message</span>
                  <span className={j(s.tag, s.live)}><span className={s.pdot} />En cours</span>
                </div>
                <div className={s.cdSub}>
                  <span>320 prospects</span><span>·</span>
                  <span>Lancée le 20 mai</span><span>·</span>
                  <span className={s.live}><span className={s.pdot} />en direct · il y a 4 min</span>
                </div>

                <div className={s.funnelHead}>
                  <span className={s.lbl}>Funnel de conversion</span>
                  <span className={s.upd}>Mis à jour il y a 24s</span>
                </div>
                <div className={s.funnel}>
                  <div className={s.fcard}>
                    <span className={s.k}>Invitations envoyées</span>
                    <span className={s.v}>198 <small>/ 320</small></span>
                    <span className={s.pbar}><i style={{ width: "62%" }} /></span>
                    <span className={s.note}>62% du carnet</span>
                  </div>
                  <div className={s.fcard}>
                    <span className={s.k}>Acceptées</span>
                    <span className={s.v}>91</span>
                    <span className={s.delta}><TrendingUp /> 46% d&apos;acceptation</span>
                  </div>
                  <div className={s.fcard}>
                    <span className={s.k}>Messages</span>
                    <span className={s.v}>87</span>
                    <span className={s.note}>1er message après acceptation</span>
                  </div>
                  <div className={s.fcard}>
                    <span className={s.k}>Réponses</span>
                    <span className={s.v}>27</span>
                    <span className={s.delta}><TrendingUp /> 31% sur messages</span>
                  </div>
                </div>

                <div className={s.chartCard}>
                  <div className={s.chartTop}>
                    <span className={s.ctTitle}>Évolution dans le temps · 14 jours</span>
                    <span className={s.legend}>
                      <span className={j(s.lg, s.inv)}><span className={s.d} />Invitations</span>
                      <span className={j(s.lg, s.rep)}><span className={s.d} />Réponses</span>
                    </span>
                  </div>
                  <div className={s.chartWrap}>
                    <svg viewBox="0 0 520 170" preserveAspectRatio="none">
                      <line x1="0" y1="50" x2="520" y2="50" stroke="var(--border)" strokeWidth="1" />
                      <line x1="0" y1="100" x2="520" y2="100" stroke="var(--border)" strokeWidth="1" />
                      <line x1="0" y1="150" x2="520" y2="150" stroke="var(--border)" strokeWidth="1" />
                      <path d="M20,104 L57,121 L94,130 L131,134 L168,52 L205,28 L242,78 L279,86 L316,82 L353,134 L390,138 L427,113 L464,100 L501,116 L501,150 L20,150 Z" fill="var(--brand-blue)" fillOpacity="0.1" />
                      <polyline points="20,104 57,121 94,130 131,134 168,52 205,28 242,78 279,86 316,82 353,134 390,138 427,113 464,100 501,116" fill="none" stroke="var(--brand-blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="20,138 57,142 94,146 131,146 168,130 205,121 242,134 279,134 316,130 353,146 390,150 427,142 464,138 501,142" fill="none" stroke="var(--purple)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--purple)" }} />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating wizard (hero) */}
          <div className={s.floatPanel}>
            <div className={s.wzHead}>
              <span className={s.liLogo}>in</span>
              <span className={s.ttl}>Créer une campagne</span>
              <X className={s.x} size={14} />
            </div>
            <div className={s.wzSteps}>
              <span className={j(s.wzNode, s.done)}>✓</span>
              <span className={j(s.wzSeg, s.ok)} />
              <span className={j(s.wzNode, s.done)}>✓</span>
              <span className={j(s.wzSeg, s.ok)} />
              <span className={j(s.wzNode, s.cur)}>3</span>
              <span className={s.wzSeg} />
              <span className={j(s.wzNode, s.todo)}>4</span>
            </div>
            <div className={s.wzCaption}><strong>Configuration</strong> · étape 3 sur 4</div>
            <div className={s.wzFlabel}>Message après acceptation</div>
            <div className={s.wzChips}>
              <span className={s.chip}>Prénom</span>
              <span className={s.chip}>Société</span>
              <span className={s.chip}>Poste</span>
              <span className={s.chip}>Lien booking</span>
            </div>
            <div className={s.wzMsg}>
              Hello <span className={s.vr}>{"{{prenom}}"}</span>
              <br />
              Voici notre lien de booking : <span className={s.vr}>{"{{lienBooking}}"}</span>
            </div>
            <div className={s.wzMeta}>
              <span>Invitation sans note d&apos;abord, puis ce message.</span>
            </div>
            <div className={s.wzCta}>Continuer <ArrowRight /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
