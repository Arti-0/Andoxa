"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  FileText,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import styles from "./messagerie-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * "Messagerie unifiée" relief mockup (LinkedIn-only). Drop-in conversion of the
 * donated HTML scene: demo chrome / fallback tokens removed, project tokens +
 * AndoxaLogoIcon wired in, scales to its container via container-query units.
 * Decorative only → aria-hidden.
 */
export function MessagerieRelief({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      el.style.setProperty("--rs", String(el.clientWidth / 1160));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Depth layers */}
          <div className={j(s.layer, s.winBack)}>
            <div className={s.winBar}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 54 }} />
              <span className={s.tab} style={{ width: 38 }} />
              <span className={s.tab} style={{ width: 46 }} />
            </div>
          </div>
          <div className={j(s.layer, s.winMid)}>
            <div className={j(s.winBar, s.brand)}>
              <span className={s.winLogo}><span className={s.mark} /></span>
              <span className={s.tab} style={{ width: 62 }} />
              <span className={s.tab} style={{ width: 42 }} />
              <span className={s.tab} style={{ width: 50 }} />
              <span className={s.tab} style={{ width: 38 }} />
            </div>
          </div>

          {/* Front window: the Andoxa Messagerie app */}
          <div className={j(s.layer, s.winFront)}>
            <div className={s.app}>
              {/* Sidebar */}
              <aside className={s.side}>
                <div className={s.sideTop}>
                  <AndoxaLogoIcon style={{ width: 22, height: 22 }} />
                  <span className={s.word}>Andoxa</span>
                  <span className={s.chev}><ChevronLeft size={15} /></span>
                </div>
                <div className={s.ws}>
                  <span className={s.wsMark}>A</span>
                  <span>
                    <span className={s.wsName}>Acme Sales</span>
                    <br />
                    <span className={s.wsPlan}>Plan Team</span>
                  </span>
                  <span className={s.wsCaret}><ChevronDown size={14} /></span>
                </div>
                <div className={s.navItem}><LayoutGrid /> Tableau de bord</div>
                <div className={s.navItem}><Users /> CRM</div>
                <div className={s.navItem}><Send /> Campagnes &amp; Appels</div>
                <div className={j(s.navItem, s.active)}><MessageCircle /> Messagerie</div>
                <div className={s.navItem}><Calendar /> Calendrier</div>
                <div className={s.navSpacer} />
                <div className={s.navSep} />
                <div className={s.navItem}><Settings /> Paramètres</div>
                <div className={s.sideFoot}>
                  <span className={j(s.av, s.avSm, s.neutral)}>ML</span>
                  <span className={s.uinfo}>
                    <span className={s.uname}>Marie Lefèvre</span>
                    <br />
                    <span className={s.umail}>marie@andoxa.fr</span>
                  </span>
                </div>
              </aside>

              {/* Main */}
              <div className={s.main}>
                <div className={s.topbar}>
                  <span className={s.title}>Messagerie</span>
                  <span className={s.search}><Search /> Rechercher un prospect…</span>
                  <span className={s.bell}><Bell size={17} /></span>
                </div>

                <div className={s.cols}>
                  {/* Conversation list */}
                  <div className={s.list}>
                    <div className={s.listHead}>
                      <span className={s.lhTitle}>Conversations</span>
                      <span className={s.lhTemplates}><FileText /> Templates</span>
                    </div>
                    <div className={s.tabsRow}>
                      <span className={j(s.tabPill, s.active)}>Tous <span className={s.cnt}>12</span></span>
                      <span className={s.tabPill}>Non lus <span className={s.cnt}>3</span></span>
                      <span className={s.tabPill}>À relancer</span>
                    </div>

                    <div className={j(s.conv, s.active)}>
                      <span className={s.avWrap}>
                        <span className={j(s.av, s.avSm, s.blue)}>EM</span>
                        <span className={s.avChip}>in</span>
                      </span>
                      <span className={s.cMid}>
                        <span className={s.cRow1}><span className={s.cName}>Élodie Mercier</span></span>
                        <span className={s.cRole}>Head of Marketing · Lumio</span>
                        <span className={j(s.pill, s.cv)}><span className={s.pdot} />Contacté</span>
                      </span>
                      <span className={s.cRight}><span className={s.cTime}>14:32</span></span>
                    </div>

                    <div className={s.conv}>
                      <span className={s.avWrap}>
                        <span className={j(s.av, s.avSm, s.blue)}>CL</span>
                        <span className={s.avChip}>in</span>
                      </span>
                      <span className={s.cMid}>
                        <span className={s.cRow1}><span className={s.cName}>Camille Laurent</span></span>
                        <span className={s.cRole}>Head of Growth · Northwind</span>
                        <span className={j(s.pill, s.ok)}><span className={s.pdot} />RDV</span>
                      </span>
                      <span className={s.cRight}>
                        <span className={s.cTime}>11:08</span>
                        <span className={s.cBadge}>2</span>
                      </span>
                    </div>

                    <div className={s.conv}>
                      <span className={s.avWrap}>
                        <span className={j(s.av, s.avSm, s.green)}>TB</span>
                        <span className={s.avChip}>in</span>
                      </span>
                      <span className={s.cMid}>
                        <span className={s.cRow1}><span className={s.cName}>Thomas Berger</span></span>
                        <span className={s.cRole}>VP Sales · Veridian</span>
                        <span className={j(s.pill, s.wait)}><span className={s.pdot} />Nouveau</span>
                      </span>
                      <span className={s.cRight}><span className={s.cTime}>Hier</span></span>
                    </div>

                    <div className={s.conv}>
                      <span className={s.avWrap}>
                        <span className={j(s.av, s.avSm, s.neutral)}>LF</span>
                        <span className={s.avChip}>in</span>
                      </span>
                      <span className={s.cMid}>
                        <span className={s.cRow1}><span className={s.cName}>Léa Fontaine</span></span>
                        <span className={s.cRole}>Founder · Brightway</span>
                        <span className={j(s.pill, s.hot)}><span className={s.pdot} />À relancer</span>
                      </span>
                      <span className={s.cRight}><span className={s.cTime}>Lun.</span></span>
                    </div>
                  </div>

                  {/* Thread */}
                  <div className={s.thread}>
                    <div className={s.threadHead}>
                      <span className={j(s.av, s.avMd, s.blue)}>EM</span>
                      <span className={s.thId}>
                        <span className={s.thRow}>
                          <span className={s.thName}>Élodie Mercier</span>
                          <span className={j(s.pill, s.cv)}><span className={s.pdot} />Contacté</span>
                          <span className={s.liChip}>in</span>
                        </span>
                        <span className={s.thRole}>Head of Marketing · Lumio</span>
                      </span>
                      <span className={s.thMenu}><MoreHorizontal size={18} /></span>
                    </div>

                    <div className={s.threadBody}>
                      <span className={s.day}>Aujourd&apos;hui</span>
                      <div className={j(s.bubble, s.out)}>Bonjour Élodie, ravi d&apos;échanger ! Auriez-vous 20 min cette semaine pour un point rapide ?</div>
                      <span className={j(s.stamp, s.out)}>14:02 · Lu</span>
                      <div className={j(s.bubble, s.in)}>Bonjour, avec plaisir. Je regarde mon agenda et reviens vers vous.</div>
                      <span className={j(s.stamp, s.in)}>14:18</span>
                      <div className={j(s.bubble, s.out)}>Parfait, je vous envoie un lien de réservation.</div>
                      <span className={j(s.stamp, s.out)}>14:25 · Lu</span>
                    </div>

                    <div className={s.composer}>
                      <div className={s.composerField}>Votre message…</div>
                      <div className={s.composerRow}>
                        <span className={s.cAct}><FileText /> Templates</span>
                        <span className={s.cAct}><Calendar /> Lien booking</span>
                        <span className={s.cAct}><Paperclip /></span>
                        <span className={s.send}><Send /> Envoyer</span>
                      </div>
                    </div>
                  </div>

                  {/* Prospect panel */}
                  <aside className={s.panel}>
                    <span className={j(s.av, s.avLg, s.blue, s.pAv)}>EM</span>
                    <div className={s.pName}>Élodie Mercier</div>
                    <div className={s.pRole}>Head of Marketing · Lumio</div>
                    <span className={j(s.pill, s.cv, s.pPill)}><span className={s.pdot} />Contacté</span>
                    <span className={s.pCta}><Eye /> Voir la fiche complète</span>

                    <div className={s.pSep} />

                    <div className={s.steps}>
                      <span className={j(s.dot, s.done)}><Check /></span>
                      <span className={j(s.seg, s.done)} />
                      <span className={j(s.dot, s.now)}>2</span>
                      <span className={s.seg} />
                      <span className={s.dot}>3</span>
                      <span className={s.seg} />
                      <span className={s.dot}>4</span>
                      <span className={s.seg} />
                      <span className={s.dot}>5</span>
                      <span className={s.seg} />
                      <span className={s.dot}>6</span>
                    </div>
                    <div className={s.pStepLabel}>Étape 2 / 6 : <strong>Contacté</strong></div>
                    <div className={s.pNext}>Suivant : Qualifié · RDV · Proposition · Gagné</div>

                    <div className={s.pSep} />

                    <div className={s.pActTitle}>Activité clé</div>
                    <div className={s.act}>
                      <span className={j(s.ai, s.li)}><MessageCircle /></span>
                      <span className={s.atxt}>
                        <span className={s.al}>Message reçu sur <b>LinkedIn</b></span>
                        <span className={s.at}>à l&apos;instant</span>
                      </span>
                    </div>
                    <div className={s.act}>
                      <span className={j(s.ai, s.cv)}><ArrowLeftRight /></span>
                      <span className={s.atxt}>
                        <span className={s.al}>Statut : Nouveau <b>→</b> Contacté</span>
                        <span className={s.at}>aujourd&apos;hui · 14:02</span>
                      </span>
                    </div>
                    <div className={s.act}>
                      <span className={j(s.ai, s.ok)}><Check /></span>
                      <span className={s.atxt}>
                        <span className={s.al}>Demande de connexion acceptée</span>
                        <span className={s.at}>hier</span>
                      </span>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>

          {/* Floating real-time notification (hero element) */}
          <div className={s.floatPanel}>
            <div className={s.fpTop}>
              <span className={s.fpLive}><span className={s.lvdot} />Temps réel</span>
              <span className={s.liChip}>in</span>
            </div>
            <div className={s.fpBody}>
              <span className={j(s.av, s.avMd, s.blue)}>EM</span>
              <span className={s.fpMeta}>
                <span className={s.fpName}>Élodie Mercier</span>
                <br />
                <span className={s.fpSub}>Nouveau message LinkedIn</span>
              </span>
            </div>
            <div className={s.fpMsg}>« Jeudi en fin de matinée me conviendrait parfaitement. »</div>
            <div className={s.fpFoot}>
              <span className={s.fpTime}>il y a 8 s</span>
              <span className={s.fpTag}><Check /> 0 prospect perdu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
