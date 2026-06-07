"use client";

import * as React from "react";
import { ArrowRight, Bell, Briefcase, Check, ChevronDown, Home, Users, X } from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import { useReliefScale } from "./use-relief-scale";
import styles from "./extension-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** "Extension Chrome" relief mockup: a LinkedIn profile (front) with the Andoxa
 *  extension panel capturing the prospect (floating hero). Decorative → aria-hidden. */
export function ExtensionRelief({ className }: { className?: string }) {
  const ref = useReliefScale(1040);
  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Depth layers */}
          <div className={j(s.layer, s.winBack)}>
            <div className={s.winBar}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 60 }} /><span className={s.tab} style={{ width: 40 }} /><span className={s.tab} style={{ width: 48 }} />
            </div>
          </div>
          <div className={j(s.layer, s.winMid)}>
            <div className={j(s.winBar, s.brand)}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 64 }} /><span className={s.tab} style={{ width: 44 }} /><span className={s.tab} style={{ width: 52 }} /><span className={s.tab} style={{ width: 40 }} />
            </div>
          </div>

          {/* Front: browser on a LinkedIn profile */}
          <div className={j(s.layer, s.winFront)}>
            <div className={s.winBar}>
              <span className={s.dot3} /><span className={s.dot3} /><span className={s.dot3} />
              <span className={s.urlbar} />
            </div>
            <div style={{ height: "calc(100% - 38px)", overflow: "hidden" }}>
              <div className={s.li}>
                <div className={s.liTop}>
                  <span className={s.liLogo}>in</span>
                  <span className={s.liSearch} />
                  <span className={s.liNav}><Home /><Users /><Briefcase /><Bell /></span>
                </div>
                <div className={s.liScroll}>
                  <div className={s.liCard}>
                    <div className={s.liBanner} />
                    <div className={s.liProfile}>
                      <div className={s.liAvatar}>ED</div>
                      <div className={s.liNameRow}>
                        <span className={s.liName}>Élodie Dubois</span>
                        <Check className={s.liVerify} size={16} />
                      </div>
                      <div className={s.liHeadline}>Head of Marketing @ Lumio · Growth &amp; Brand</div>
                      <div className={s.liSub}>Paris, Île-de-France · <span className={s.liConns}>4 872 relations</span></div>
                      <div className={s.liActions}>
                        <span className={j(s.liBtn, s.primary)}>Se connecter</span>
                        <span className={j(s.liBtn, s.ghost)}>Message</span>
                        <span className={j(s.liBtn, s.ghost)}>Plus</span>
                      </div>
                    </div>
                    <div className={s.liSection}>
                      <div className={s.liSecTitle}>Expérience</div>
                      <div className={s.liExp}>
                        <span className={s.co} />
                        <div>
                          <div className={s.et}>Head of Marketing</div>
                          <div className={s.es}>Lumio · CDI · 2022 - Aujourd&apos;hui</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Andoxa extension panel (hero) */}
          <div className={s.floatPanel}>
            <div className={s.extHead}>
              <AndoxaLogoIcon size={22} />
              <span className={s.name}>Andoxa</span>
              <span className={s.tag}>Extension</span>
              <X className={s.x} size={14} />
            </div>
            <div className={s.extStatus}><span className={s.dot} /> Profil détecté sur LinkedIn</div>
            <div className={s.extCard}>
              <div className={s.extProf}>
                <span className={s.av}>ED</span>
                <div>
                  <div className={s.nm}>Élodie Dubois</div>
                  <div className={s.rl}>Head of Marketing · Lumio</div>
                </div>
              </div>
              <div className={s.extFields}>
                <div className={s.extField}><Check className={s.check} size={14} /><span className={s.lbl}>Poste</span><span className={s.val}>Head of Marketing</span></div>
                <div className={s.extField}><Check className={s.check} size={14} /><span className={s.lbl}>Entreprise</span><span className={s.val}>Lumio</span></div>
                <div className={s.extField}><Check className={s.check} size={14} /><span className={s.lbl}>Localisation</span><span className={s.val}>Paris, FR</span></div>
              </div>
            </div>
            <div className={s.extSelect}>
              <span className={s.sd} />
              <span className={s.seqn}>Campagne : <strong>Prospection Q3</strong></span>
              <ChevronDown size={14} />
            </div>
            <div className={s.extCta}>Importer vers Andoxa <ArrowRight /></div>
            <div className={s.extFoot}>1 prospect · synchronisé avec votre CRM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
