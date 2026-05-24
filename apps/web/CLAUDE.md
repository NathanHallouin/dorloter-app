# CLAUDE.md · apps/web

> SPA publique de Dorloter (`dorloter.fr`), la vitrine adoptants. Ce fichier
> complète le [CLAUDE.md racine](../../CLAUDE.md), qui porte l'identité du
> produit, les conventions transverses et la règle typographique.

## Stack

React 19 + Vite + React Router + TanStack Query, port **5173**. Le design system vient de `@dorloter/ui`, l'accès API de `@dorloter/client` · ces deux packages ont leur propre CLAUDE.md.

Proxy dev : `/api` vers `localhost:8080` (cf. `VITE_API_PROXY`).

## Périmètre

Tout ce qui est public : catalogue d'adoption (grille, filtres, swipe, quiz, comparateur), carte des perdus/trouvés, annuaire des pensions et des refuges, espace membre (favoris, candidatures, réservations, messagerie, notifications, profil), pages éditoriales et légales.

**Les consoles professionnelles ne vivent PAS ici** : refuge, pension et admin plateforme sont dans `apps/pro`.

**Accès sans compte** : catalogue, carte des signalements et annuaires doivent rester consultables sans authentification. L'auth n'est requise que pour signaler, candidater, gérer des favoris, échanger.

## Conventions

- Props typées avec une interface dédiée, pas de `any`.
- Un composant par fichier. Les pages sont en PascalCase dans `src/pages/` (`CatalogPage.tsx`), les composants dans `src/components/`.
- Imports absolus via `@/` mappé sur `src/`.
- Données via TanStack Query, jamais de `fetch` direct dans un composant : passer par les modules de `@dorloter/client`.
- Les composants de formulaire vivent dans le dossier de leur domaine.

### Style

- Tailwind CSS v4 uniquement, configuration CSS-first via `@theme` (pas de `tailwind.config.js`). Plugin `@tailwindcss/vite`.
- **Mobile-first obligatoire** : catalogue et signalements sont consultés surtout sur téléphone.
- Palette et primitives : voir `packages/ui`. Ne pas réinventer un bouton ou un champ localement.
- Dark mode via `dark:`, piloté par la classe sur `<html>`.
- **Piège connu** : `theme.css` n'est pas dans une cascade layer, donc son reset `a { text-decoration: none; color: inherit }` bat les utilitaires Tailwind. Pour un lien visible dans de la prose, utiliser la classe `.inline-link` du thème plutôt que `text-* underline`.

### Cartographie

- MapLibre GL JS via `react-map-gl`. Les pages carto sont chargées en `lazy()` : MapLibre pèse plus d'un mégaoctet.
- Tuiles : OpenFreeMap ou Protomaps (gratuit, open-source). `VITE_MAP_STYLE` permet de pointer un autre style.
- GeoJSON pour les signalements et les refuges, cluster automatique sous le zoom 12.
- Popup au clic sur le marqueur, jamais au survol (mobile).
- `LocationPickerMap` est le composant réutilisable de sélection d'un point (formulaire de signalement, zone du profil).

### Champs conditionnels par espèce

`fivFelv` et `indoorOnly` ne concernent que les chats et arrivent à `null` sinon. Toujours null-checker avant affichage, et masquer le champ quand `species !== "chat"`.

## RGPD

Les pages légales (`/mentions-legales`, `/confidentialite`, `/cgu`) vivent ici, dans `src/pages/` avec leurs composants dans `src/components/legal/`. La politique de confidentialité **décrit ce que le code fait réellement** : toute évolution du modèle de données ou des durées de purge côté API doit y être répercutée. Les trous restants sont marqués par le composant `ToFill`, volontairement voyant.

Aucune ressource ne doit être servie par un CDN tiers : les polices sont auto-hébergées via `packages/ui/src/fonts.css`. Aucun cookie non essentiel, donc pas de bandeau de consentement · en ajouter un tracker romprait cette exemption.

## Commandes

```bash
bun dev            # Vite dev (proxy /api vers localhost:8080)
bun run build      # typecheck + build prod
bun run typecheck  # tsc --noEmit
```

## Variables d'environnement

```env
VITE_API_PROXY=http://localhost:8080   # cible du proxy /api en dev
VITE_MAP_STYLE=...                     # style MapLibre (ou OpenFreeMap sans clé)
```
