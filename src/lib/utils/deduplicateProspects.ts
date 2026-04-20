// utils/deduplicateProspects.ts
// Fonction utilitaire pour dédupliquer un tableau de prospects avant import
// Place ce fichier dans my-app/lib/utils/deduplicateProspects.ts

export interface ProspectRow {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Déduplique un tableau de prospects selon une priorité de clés (email, phone, LinkedIn...)
 * @param rows Les rows à filtrer (issues du CSV, déjà mappées)
 * @param existingKeys Les valeurs déjà présentes en base (ex: emails déjà existants)
 * @param keyPriority Liste de clés à tester dans l'ordre de priorité
 * @returns Les rows uniques à importer
 */
export function deduplicateProspects(
  rows: ProspectRow[],
  existingKeys: Set<string>,
  keyPriority: string[] = ["email", "phone", "linkedin"]
): ProspectRow[] {
  console.log(`[deduplicateProspects] Starting with ${rows.length} rows`);
  console.log(`[deduplicateProspects] Existing keys: ${existingKeys.size}`);
  console.log(`[deduplicateProspects] Key priority:`, keyPriority);

  const seen = new Set(existingKeys);
  let duplicatesFound = 0;

  const result = rows.filter((row, idx) => {
    // Cherche la première clé dispo dans la priorité
    const key = keyPriority.find(
      (k) => row[k] && typeof row[k] === "string" && row[k].trim() !== ""
    );

    if (!key) {
      if (idx < 5) {
        // Log seulement les 5 premiers pour éviter le spam
        console.log(
          `[deduplicateProspects] Row ${idx}: aucune clé trouvée pour la déduplication`,
          { email: row.email, phone: row.phone, linkedin: row.linkedin }
        );
      }
      return true; // Si aucune clé, on garde (pas de critère de doublon)
    }

    const value = String(row[key] || "")
      .toLowerCase()
      .trim();

    if (idx < 5) {
      // Log seulement les 5 premiers pour éviter le spam
      console.log(
        `[deduplicateProspects] Row ${idx}: clé utilisée = ${key}, valeur = "${value}"`
      );
    }

    if (seen.has(value)) {
      duplicatesFound++;
      if (duplicatesFound <= 5) {
        // Log seulement les 5 premiers doublons
        console.log(
          `[deduplicateProspects] DUPLICATE FOUND: Row ${idx} with ${key}="${value}"`
        );
      }
      return false;
    }

    seen.add(value);
    return true;
  });

  console.log(
    `[deduplicateProspects] Result: ${result.length} rows kept, ${duplicatesFound} duplicates removed`
  );

  return result;
}

/**
 * Classifie un lot de prospects à importer en trois buckets selon leur état actuel :
 *   - inserts   : aucune clé ne correspond à un prospect existant → à créer
 *   - restores  : clé correspond à un prospect en corbeille (soft-delete) → à restaurer
 *   - duplicates: clé correspond à un prospect actif → à ignorer
 *
 * Le caller fournit les clés des prospects actifs (existingLiveKeys) et une map
 * clé → prospect_id pour les prospects en corbeille. La même clé ne doit pas figurer
 * dans les deux; si c'est le cas, "actif" l'emporte (résultat → duplicates).
 */
export function classifyProspectsForImport<
  T extends ProspectRow
>(
  rows: T[],
  existingLiveKeys: Set<string>,
  trashedByKey: Map<string, string>,
  keyPriority: string[] = ["email", "phone", "linkedin"]
): {
  inserts: T[];
  restores: Array<{ row: T; prospectId: string }>;
  duplicates: T[];
} {
  const liveSeen = new Set(existingLiveKeys);
  const trashedSeen = new Map(trashedByKey);
  const inserts: T[] = [];
  const restores: Array<{ row: T; prospectId: string }> = [];
  const duplicates: T[] = [];

  for (const row of rows) {
    const key = keyPriority.find(
      (k) => row[k] && typeof row[k] === "string" && (row[k] as string).trim() !== ""
    );
    if (!key) {
      inserts.push(row);
      continue;
    }
    const value = String(row[key] ?? "").toLowerCase().trim();

    if (liveSeen.has(value)) {
      duplicates.push(row);
      continue;
    }
    const trashedProspectId = trashedSeen.get(value);
    if (trashedProspectId) {
      restores.push({ row, prospectId: trashedProspectId });
      trashedSeen.delete(value);
      liveSeen.add(value);
      continue;
    }
    inserts.push(row);
    liveSeen.add(value);
  }

  return { inserts, restores, duplicates };
}

/**
 * Mapping dynamique pour remplir les champs standards à partir des metadata ou autres colonnes CSV
 * À utiliser lors du parsing CSV, avant l'upsert
 */
export function mapProspectRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  // On cherche dans metadata ou dans les colonnes à plat
  const meta = (row.metadata as Record<string, unknown>) || row;

  return {
    ...row,
    full_name:
      row.full_name ||
      (meta["Nom Complet"] as string) ||
      (meta["full_name"] as string) ||
      (meta["Full Name"] as string) ||
      ((meta["Prénom"] as string) && (meta["Nom"] as string)
        ? `${meta["Prénom"] as string} ${meta["Nom"] as string}`
        : undefined),
    email:
      (row.email as string) ||
      (meta["Email"] as string) ||
      (meta["email"] as string) ||
      (meta["E-mail"] as string) ||
      (meta["e-mail"] as string) ||
      (meta["Mail"] as string) ||
      (meta["mail"] as string) ||
      (meta["Adresse email"] as string) ||
      (meta["adresse email"] as string) ||
      (meta["Email Address"] as string) ||
      (meta["email address"] as string),
    phone:
      (row.phone as string) ||
      (meta["Téléphone"] as string) ||
      (meta["phone"] as string),
    linkedin:
      (row.linkedin as string) ||
      (meta["LinkedIn"] as string) ||
      (meta["linkedin"] as string) ||
      (meta["Linkedin"] as string) ||
      (meta["LinkedIn profile"] as string) ||
      (meta["linkedin profile"] as string),
    company:
      (row.company as string) ||
      (meta["Société"] as string) ||
      (meta["company"] as string) ||
      (meta["company_name"] as string) ||
      (meta["Entreprise"] as string) ||
      (meta["Company"] as string),

    // Ajoute d'autres mappings si besoin
  };
}
