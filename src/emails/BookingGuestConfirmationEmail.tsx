export type BookingGuestConfirmationEmailProps = {
  hostName: string;
  dateLine: string;
  timeLine: string;
  meetUrl: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Confirmation invité — RDV réservé via page publique (style aligné sur BookingOwnerConfirmationEmail).
 */
export function BookingGuestConfirmationEmail({
  hostName,
  dateLine,
  timeLine,
  meetUrl,
}: BookingGuestConfirmationEmailProps) {
  const safeHost = esc(hostName);
  const safeDate = esc(dateLine);
  const safeTime = esc(timeLine);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Votre rendez-vous est confirmé — Andoxa</title>
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
                          Votre rendez-vous est confirmé
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
                          Voici le récapitulatif de votre créneau avec <strong>{safeHost}</strong>.
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
                              <td style={{ padding: "6px 0", fontWeight: 600, width: 140 }}>Hôte</td>
                              <td style={{ padding: "6px 0" }}>{safeHost}</td>
                            </tr>
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
                            Le lien de visioconférence n’est pas encore disponible. L’hôte peut vous le transmettre
                            directement si besoin.
                          </p>
                        )}

                        <p
                          style={{
                            margin: 0,
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#94a3b8",
                          }}
                        >
                          Propulsé par Andoxa
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
