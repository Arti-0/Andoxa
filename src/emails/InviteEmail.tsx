interface InviteEmailProps {
  confirmUrl: string;
  orgName: string;
  invitedBy: string;
}

/**
 * E-mail d'invitation org — le CTA pointe vers Supabase /auth/v1/verify (magic link),
 * puis vers /api/auth/confirm?invite_token=…
 */
export function InviteEmail({
  confirmUrl,
  orgName,
  invitedBy,
}: InviteEmailProps) {
  const safeOrg = orgName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeBy = invitedBy.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invitation — Andoxa</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f1f5f9" }}>
        <div
          style={{
            display: "none",
            maxHeight: 0,
            overflow: "hidden",
          }}
        >
          {safeBy} vous invite à rejoindre {safeOrg} sur Andoxa.
        </div>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#f1f5f9" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ maxWidth: 560, margin: "0 auto" }}
                >
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
                          Invitation à rejoindre l&apos;équipe
                        </h1>
                        <p
                          style={{
                            margin: "0 0 24px 0",
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: "#475569",
                          }}
                        >
                          <strong style={{ color: "#0f172a" }}>{safeBy}</strong>{" "}
                          vous invite à rejoindre{" "}
                          <strong style={{ color: "#0f172a" }}>{safeOrg}</strong>{" "}
                          sur <strong style={{ color: "#0f172a" }}>Andoxa</strong>.
                          Utilisez le même lien avec l&apos;adresse e-mail qui a reçu ce
                          message.
                        </p>
                        <table
                          role="presentation"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ margin: "0 auto 24px auto" }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  borderRadius: 9999,
                                  backgroundColor: "#5e6ad2",
                                }}
                              >
                                <a
                                  href={confirmUrl}
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
                                  Rejoindre {safeOrg}
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "system-ui,sans-serif",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#94a3b8",
                          }}
                        >
                          Si le bouton ne fonctionne pas, copiez ce lien dans votre
                          navigateur :
                          <br />
                          <span
                            style={{
                              wordBreak: "break-all",
                              color: "#4f46e5",
                            }}
                          >
                            {confirmUrl}
                          </span>
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
