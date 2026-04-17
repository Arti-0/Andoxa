export type BookingOwnerConfirmationEmailProps = {
  guestName: string;
  guestEmail: string;
  guestLinkedin: string | null;
  guestPhone: string | null;
  dateLine: string;
  timeLine: string;
  meetUrl: string | null;
  crmProspectUrl: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Confirmation hôte — nouveau RDV via page publique (style aligné sur InviteEmail).
 */
export function BookingOwnerConfirmationEmail({
  guestName,
  guestEmail,
  guestLinkedin,
  guestPhone,
  dateLine,
  timeLine,
  meetUrl,
  crmProspectUrl,
}: BookingOwnerConfirmationEmailProps) {
  const safeName = esc(guestName);
  const safeEmail = esc(guestEmail);
  const safeLi = guestLinkedin ? esc(guestLinkedin) : null;
  const safePhone = guestPhone ? esc(guestPhone) : null;
  const safeDate = esc(dateLine);
  const safeTime = esc(timeLine);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nouveau rendez-vous — Andoxa</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f1f5f9" }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f1f5f9" }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 560, margin: "0 auto" }}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          padding: "40px 36px",
                        }}
                      >
                        <h1
                          style={{
                            margin: "0 0 12px 0",
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 22,
                            fontWeight: 600,
                            color: "#0f172a",
                          }}
                        >
                          Nouveau rendez-vous
                        </h1>
                        <p
                          style={{
                            margin: "0 0 20px 0",
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: "#475569",
                          }}
                        >
                          Un invité vient de réserver un créneau via votre lien Andoxa.
                        </p>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{
                            marginBottom: 24,
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 14,
                            color: "#334155",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "6px 0", fontWeight: 600, width: 140 }}>Nom</td>
                              <td style={{ padding: "6px 0" }}>{safeName}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "6px 0", fontWeight: 600 }}>E-mail</td>
                              <td style={{ padding: "6px 0", wordBreak: "break-all" }}>{safeEmail}</td>
                            </tr>
                            {safeLi ? (
                              <tr>
                                <td style={{ padding: "6px 0", fontWeight: 600 }}>LinkedIn</td>
                                <td style={{ padding: "6px 0", wordBreak: "break-all" }}>{safeLi}</td>
                              </tr>
                            ) : null}
                            {safePhone ? (
                              <tr>
                                <td style={{ padding: "6px 0", fontWeight: 600 }}>Téléphone</td>
                                <td style={{ padding: "6px 0" }}>{safePhone}</td>
                              </tr>
                            ) : null}
                            <tr>
                              <td style={{ padding: "6px 0", fontWeight: 600 }}>Date</td>
                              <td style={{ padding: "6px 0" }}>{safeDate}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "6px 0", fontWeight: 600 }}>Heure</td>
                              <td style={{ padding: "6px 0" }}>{safeTime}</td>
                            </tr>
                          </tbody>
                        </table>

                        {meetUrl ? (
                          <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "0 auto 24px auto" }}>
                            <tbody>
                              <tr>
                                <td style={{ borderRadius: 9999, backgroundColor: "#5e6ad2" }}>
                                  <a
                                    href={meetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "inline-block",
                                      padding: "14px 32px",
                                      fontFamily: "system-ui,sans-serif",
                                      fontSize: 15,
                                      fontWeight: 600,
                                      color: "#ffffff",
                                      textDecoration: "none",
                                      borderRadius: 9999,
                                    }}
                                  >
                                    Rejoindre la réunion
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          <p
                            style={{
                              margin: "0 0 24px 0",
                              padding: "12px 16px",
                              backgroundColor: "#fffbeb",
                              border: "1px solid #fde68a",
                              borderRadius: 8,
                              fontFamily: "system-ui,sans-serif",
                              fontSize: 14,
                              color: "#92400e",
                            }}
                          >
                            Lien de réunion non disponible — connectez Google Calendar dans vos paramètres
                            Andoxa (Intégrations) pour générer automatiquement un lien Google Meet.
                          </p>
                        )}

                        {crmProspectUrl ? (
                          <p style={{ margin: "0 0 16px 0", fontFamily: "system-ui,sans-serif", fontSize: 14 }}>
                            <a
                              href={crmProspectUrl}
                              style={{ color: "#4f46e5", fontWeight: 600 }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ouvrir la fiche prospect dans le CRM
                            </a>
                          </p>
                        ) : null}

                        <p
                          style={{
                            margin: 0,
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#94a3b8",
                          }}
                        >
                          Message envoyé automatiquement par Andoxa.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
