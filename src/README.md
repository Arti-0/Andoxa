# src-dev - Nouvelle Architecture Andoxa

> **"Moins mais mieux"** - Cette architecture vise à simplifier radicalement le codebase tout en améliorant l'expérience utilisateur et développeur.

## 📊 Comparatif Avant/Après

| Métrique | Avant (`src/`) | Après (`src-dev/`) |
|----------|----------------|---------------------|
| Middleware | ~270 lignes | **~100 lignes** |
| Layout (app) | ~335 lignes + logique | **~60 lignes** |
| Hooks auth | 10 hooks différents | **1 hook (`useWorkspace`)** |
| Pages CRM | 3 (bdd/prospects/pipeline) | **1 (crm)** |
| Dashboards | 3 (dashboard/overview/exe) | **1 (dashboard)** |
| API Endpoints | 78 fichiers | **~20 fichiers** |
| Navigation | Sidebar surchargée | **4-5 items** |

## 🏗️ Architecture

```
src-dev/
├── app/
│   ├── (public)/           # Routes sans auth (/, /pricing, /auth)
│   ├── (protected)/        # Routes avec auth (dashboard, crm, etc.)
│   └── api/                # API endpoints consolidés
│
├── components/
│   ├── layout/             # Sidebar, Header
│   ├── dashboard/          # Composants dashboard
│   ├── crm/                # Composants CRM unifiés
│   └── ui/                 # Composants UI de base
│
└── lib/
    ├── workspace/          # Context + hooks workspace
    ├── api/                # Handlers API standardisés
    └── cache/              # Cache Redis
```

## 🎯 Concepts Clés

### 1. useWorkspace() - Le hook unique

```tsx
function MyComponent() {
  const {
    user,           // Auth user
    profile,        // User profile
    workspace,      // Current workspace
    hasActivePlan,  // Plan actif ?
    canManageTeam,  // Permission ?
    signOut,        // Action
  } = useWorkspace();

  // C'est tout ! Plus besoin de jongler entre 10 hooks.
}
```

### 2. Middleware Simplifié

Le middleware fait une chose et la fait bien :
1. Routes publiques → passe
2. Pas de session → `/auth/login`
3. Pas de workspace → `/plan`
4. Pas de plan actif → `/pricing`
5. Sinon → passe

### 3. API Standardisée

```ts
// Avant: 78 patterns différents
// Après: 1 pattern unique

export const GET = createApiHandler(async (req, ctx) => {
  // ctx contient: userId, workspace, supabase, cache
  return await fetchData(ctx.workspaceId);
});
```

### 4. CRM Unifié

Une seule page avec filtres remplace 3 pages séparées :
- **Status**: Nouveau, Contacté, Qualifié, Perdu, Gagné
- **Source**: LinkedIn, Import, Manuel, Website
- **Tags**: Tags personnalisés
- **Vue**: Table ou Kanban

## 🚀 Migration

Pour migrer progressivement :

1. **Phase 1**: Copier `lib/workspace/` vers `src/lib/`
2. **Phase 2**: Remplacer `middleware.ts`
3. **Phase 3**: Mettre à jour les layouts
4. **Phase 4**: Migrer les pages une par une
5. **Phase 5**: Supprimer le code legacy

## 📁 Structure des Fichiers

### lib/workspace/
- `types.ts` - Types TypeScript
- `context.tsx` - WorkspaceProvider
- `hooks.ts` - useWorkspace et variantes
- `index.ts` - Exports publics

### lib/api/
- `handlers.ts` - createApiHandler, Errors
- `index.ts` - Exports publics

### lib/cache/
- `redis.ts` - Cache avec fallback mémoire

## ✅ Checklist Migration

- [ ] Copier `lib/workspace/` dans `src/lib/`
- [ ] Remplacer le middleware
- [ ] Mettre à jour `(app)/layout.tsx`
- [ ] Migrer `/dashboard`
- [ ] Fusionner `/bdd`, `/prospects`, `/pipeline` → `/crm`
- [ ] Supprimer `/overview` et `/exe`
- [ ] Consolider les API endpoints
- [ ] Mettre à jour la sidebar
- [ ] Ajouter Redis (optionnel)
- [ ] Tests E2E

## 🔧 Variables d'Environnement

```env
# Supabase (existant)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Redis (optionnel - fallback sur mémoire)
REDIS_URL=redis://localhost:6379
```

## 📚 Documentation Complémentaire

Voir le dossier `REFONTE/` pour la documentation détaillée de chaque phase.
