"use client";

import * as React from "react";
import { Calendar, Check, Link2, Lock, Mail } from "lucide-react";
import { AndoxaLogoIcon } from "@/components/marketing/icons/brand-icons";
import { useReliefScale } from "./use-relief-scale";
import styles from "./connect-relief.module.css";

const s = styles;
const j = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** "Connecter son compte LinkedIn" : carte de connexion (hero) + panneau
 *  Intégrations en profondeur. À plat, décoratif → aria-hidden. */
export function ConnectRelief({ className }: { className?: string }) {
  const ref = useReliefScale(900);
  return (
    <div ref={ref} className={j(s.scene, className)} aria-hidden="true">
      <div className={s.fit}>
        <div className={s.stage}>
          {/* Profondeur : Intégrations */}
          <div className={j(s.layer, s.winBack)}>
            <div className={s.igBar}>
              <span className={s.igMark}>
                <AndoxaLogoIcon size={18} />
              </span>
              <span className={s.ttl}>Intégrations</span>
            </div>
            <div className={s.igList}>
              <div className={s.igRow}>
                <span className={s.igIco} style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                  <Calendar />
                </span>
                <span className={s.igName}>Google Calendar</span>
                <span className={j(s.igStatus, s.ok)}>
                  <Check strokeWidth={2.4} />
                  Connecté
                </span>
              </div>
              <div className={j(s.igRow, s.hl)}>
                <span className={s.igIco} style={{ background: "var(--li-blue)" }}>
                  <span className={s.igIn}>in</span>
                </span>
                <span className={s.igName}>LinkedIn</span>
                <span className={j(s.igStatus, s.todo)}>À connecter</span>
              </div>
              <div className={s.igRow}>
                <span className={s.igIco} style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                  <Mail />
                </span>
                <span className={s.igName}>Messagerie</span>
                <span className={j(s.igStatus, s.ok)}>
                  <Check strokeWidth={2.4} />
                  Connecté
                </span>
              </div>
            </div>
          </div>

          {/* Héros : la connexion */}
          <div className={j(s.layer, s.connectCard)}>
            <div className={s.ccTop}>
              <AndoxaLogoIcon size={24} />
              <span className={s.nm}>Andoxa</span>
              <span className={s.tag}>Intégration</span>
            </div>

            <div className={s.ccLink}>
              <span className={s.ccNode}>
                <AndoxaLogoIcon size={60} />
              </span>
              <span className={s.ccWire}>
                <span className={s.ccPlug}>
                  <Link2 />
                </span>
              </span>
              <span className={j(s.ccNode, s.li)}>
                <span className={s.in}>in</span>
              </span>
            </div>

            <div className={s.ccTitle}>Connectez votre compte LinkedIn</div>
            <p className={s.ccSub}>
              Synchronisez vos messages, votre pipeline et vos rendez-vous dans Andoxa.
            </p>

            <div className={s.ccCta}>
              <span className={s.in}>in</span>
              Connecter LinkedIn
            </div>

            <div className={s.ccReassure}>
              <Lock />
              Connexion sécurisée, révocable à tout moment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
