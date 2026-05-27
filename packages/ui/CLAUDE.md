# CLAUDE.md · packages/ui

> Design system partagé (`@dorloter/ui`), consommé par `apps/web` et
> `apps/pro`. Ce fichier complète le [CLAUDE.md racine](../../CLAUDE.md).

## Contenu

Primitives (`Btn`, `Input`, `Select`, `Textarea`, `Field`, `Pill`, `Panel`…), `Icon`, helper `cn`, thème CSS (`theme.css`), polices auto-hébergées (`fonts.css`). Tout passe par le barrel `src/index.ts`.

Direction artistique « gazette / éditorial » : serif de presse pour les titres, libellés mono, filets, angles nets, palette vert bouteille / ambre / crème / encre.

Les primitives sont **maison**, inspirées de shadcn/ui (même approche `cva` + `cn`) mais sans la dépendance. Ne pas installer shadcn pour ajouter un composant : l'écrire ici, dans le style des voisins.

> **Piège de nommage** : l'échelle de couleur s'appelle `coral-*` pour des raisons historiques, mais elle rend un **vert bouteille** depuis la refonte éditoriale. `coral-700` n'est pas corail. Se fier aux valeurs de `theme.css`, pas aux noms.

## Conventions

- Nommage des fichiers en **kebab-case** ici (`date-picker.tsx`), contrairement aux pages des apps qui sont en PascalCase. Suivre le voisinage.
- Un composant par fichier, export nommé en PascalCase.
- Aucune dépendance à React Router, TanStack Query ou à la couche API : ce package doit rester purement présentationnel.
- Props typées avec une interface dédiée, pas de `any`.

## Tailwind v4

- Configuration **CSS-first** via `@theme` dans `theme.css`. Pas de `tailwind.config.js`.
- Les apps consommatrices doivent déclarer `@source "../../../packages/ui/src"` : sans ça Tailwind ne scanne pas ce package, qui est hors `node_modules`.
- Les tokens sont exposés en `@theme inline`, donc les utilitaires émettent des `var(--…)` et le swap dark fonctionne automatiquement.

## Piège de cascade : le reset `a`

`theme.css` est importé **hors cascade layer**. Ses règles d'élément battent donc tous les utilitaires Tailwind, qui vivent dans `@layer utilities`, quelle que soit la spécificité.

Conséquence concrète : `a { text-decoration: none; color: inherit }` écrase silencieusement un `text-coral-700 underline` posé sur un `<Link>`. Les classes sont bien générées, elles n'ont simplement aucun effet.

Pour un lien visible dans de la prose, utiliser la classe **`.inline-link`** définie dans `theme.css`. Même logique pour toute future règle qui devrait l'emporter sur un reset d'élément : la définir ici plutôt que de forcer avec `!important`.

## Polices

Auto-hébergées via `@fontsource-variable/*`, importées par `fonts.css` que chaque app charge **avant** `tailwindcss`. Les familles portent le suffixe « Variable » (`"Newsreader Variable"`, `"Hanken Grotesk Variable"`, `"Geist Mono Variable"`).

C'est une contrainte RGPD, pas une préférence : charger les polices depuis un CDN tiers transmettrait l'IP de chaque visiteur avant tout consentement. Ne jamais réintroduire de `<link>` vers `fonts.googleapis.com`.

Vérification après build :

```bash
cd apps/web && bun run build && grep -r 'fonts.googleapis.com\|fonts.gstatic.com' dist/   # doit être vide
```

## Commandes

```bash
bun run typecheck  # tsc --noEmit
```
