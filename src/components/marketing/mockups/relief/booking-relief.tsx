"use client";

import * as React from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, Lock, Video } from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import { useReliefScale } from "./use-relief-scale";
import styles from "./booking-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** "Booking + agenda connecté" relief mockup. A prospect picks a slot on the
 *  public booking page (front); the RDV lands in the Google-synced calendar
 *  (depth). Decorative → aria-hidden. */
export function BookingRelief({ className }: { className?: string }) {
  const ref = useReliefScale(1040);

  const days = Array.from({ length: 21 }, (_, i) => i + 1);
  const dows = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Connected calendar (depth) */}
          <div className={j(s.layer, s.winAgenda)}>
            <div className={s.agBar}>
              <AndoxaLogoIcon size={18} />
              <span className={s.gcalSync}>
                <Calendar className={s.gc} />
                <span className={s.gname}>Google Calendar</span>
                <Check className={s.ok} />
              </span>
            </div>
            <div className={s.agGrid}>
              <div className={s.agTimes}>
                <div className={s.agTime}>08:00</div>
                <div className={s.agTime}>09:00</div>
                <div className={s.agTime}>10:00</div>
                <div className={s.agTime}>11:00</div>
              </div>
              {[
                { dow: "lun", n: "8", evt: { c: "ok", t: "Appel découverte", s: "09:00 – 09:30", top: "27%", h: "21%" } },
                { dow: "mar", n: "9", today: true, evt: { c: "cv", t: "Démo produit", s: "09:00 – 09:30", top: "27%", h: "21%" } },
                { dow: "mer", n: "10", evt: { c: "ok", t: "Point équipe", s: "10:00 – 10:30", top: "52%", h: "21%" } },
                { dow: "jeu", n: "11", evt: { c: "ok", t: "Point équipe", s: "10:00 – 10:30", top: "52%", h: "21%" } },
                { dow: "ven", n: "12", evt: { c: "ok", t: "Appel découverte", s: "09:00 – 09:30", top: "27%", h: "21%" } },
              ].map((col) => (
                <div key={col.dow} className={s.agCol}>
                  <div className={j(s.agColHead, col.today && s.today)}>
                    <span className={s.dow}>{col.dow}</span>
                    <span className={s.dnum}>{col.n}</span>
                  </div>
                  <div className={s.agRows}>
                    <div className={s.agRowline} /><div className={s.agRowline} /><div className={s.agRowline} /><div className={s.agRowline} />
                    <div className={j(s.agEvent, s[col.evt.c])} style={{ top: col.evt.top, height: col.evt.h }}>
                      <div className={s.evT}>{col.evt.t}</div>
                      <div className={s.evS}>{col.evt.s}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking page (front) */}
          <div className={j(s.layer, s.winFront)}>
            <div className={s.bkTop}>
              <span className={s.dot3} /><span className={s.dot3} /><span className={s.dot3} />
              <span className={s.url}>andoxa.fr/booking/acme-sales</span>
            </div>
            <div className={s.bkStep}>
              <span className={j(s.st, s.active)}><span className={s.n}>1</span>Créneau</span>
              <span className={s.sep} />
              <span className={s.st}><span className={s.n}>2</span>Vos infos</span>
              <span className={s.sep} />
              <span className={s.st}><span className={s.n}>3</span>Confirmation</span>
            </div>
            <div className={s.bkBody}>
              <div className={s.bkInfo}>
                <div className={s.lab}>Rendez-vous avec</div>
                <div className={s.bkHost}>
                  <span className={s.av}>CL</span>
                  <span className={s.hn}>Camille Laurent</span>
                </div>
                <h3>Démo produit</h3>
                <p className={s.desc}>Un tour d&apos;horizon d&apos;Andoxa adapté à votre équipe.</p>
                <div className={s.bkPills}>
                  <span className={j(s.bkPill, s.dur)}><Clock /> 30 min</span>
                  <span className={j(s.bkPill, s.visio)}><Video /> Visioconférence</span>
                </div>
                <div className={s.bkTrust}>
                  <div className={s.tr}><Check /> Confirmation instantanée</div>
                  <div className={s.tr}><Lock /> Données chiffrées · RGPD</div>
                </div>
              </div>
              <div className={s.bkCal}>
                <div className={s.bkCalHead}>
                  <span className={s.mo}>Juin 2026</span>
                  <div className={s.bkCalNav}>
                    <span className={s.navbtn}><ChevronLeft /></span>
                    <span className={s.navbtn}><ChevronRight /></span>
                  </div>
                </div>
                <div className={s.bkDow}>{dows.map((d) => <span key={d}>{d}</span>)}</div>
                <div className={s.bkDays}>
                  {days.map((d) => {
                    const muted = d < 3;
                    const today = d === 3;
                    const sel = d === 9;
                    return (
                      <span key={d} className={j(s.bkDay, muted && s.muted, today && s.today, sel && s.sel, !muted && s.avail)}>{d}</span>
                    );
                  })}
                </div>
                <div className={s.bkLegend}><span className={s.ld} /> Disponible</div>
              </div>
              <div className={s.bkSlots}>
                <div className={s.sh}>Mardi 9 juin</div>
                <div className={s.ss}>2 créneaux · 30 min</div>
                <div className={j(s.bkSlot, s.sel)}>09:00</div>
                <div className={s.bkSlot}>09:30</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
