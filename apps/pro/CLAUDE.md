# CLAUDE.md · apps/pro

> SPA de l'espace professionnel (`pro.dorloter.fr`) : consoles refuge et
> pension, plus l'administration de la plateforme. Ce fichier complète le
> [CLAUDE.md racine](../../CLAUDE.md).

## Stack

React 19 + Vite + React Router + TanStack Query, port **5174**. Partage `@dorloter/ui` et `@dorloter/client` avec `apps/web` : aucune duplication de design system ni de couche API.

## Architecture de la console

- **`DashShell`** : le shell commun (navigation latérale, en-tête, contenu).
- **`ConsoleHome`** : aiguillage par rôle vers la console refuge, pension ou admin.
- **`RequirePro`** : garde d'accès. Elle laisse passer un rôle professionnel **ou** une appartenance à un refuge · un bénévole invité a `role=user` et doit malgré tout entrer.
- Les layouts par domaine (`ShelterConsoleLayout`, `PensionConsoleLayout`, `AdminConsoleLayout`) portent la navigation de leur périmètre.
- `components/dash/kit.tsx` regroupe les primitives propres au back-office (`Panel`, `MiniBtn`, `Tag`, `Select`, classe `field`). Les primitives génériques restent dans `@dorloter/ui`.

## Autorisation

**Le front n'est jamais la frontière de sécurité.** `RequirePro` évite d'afficher une console vide, rien de plus : c'est l'API qui autorise, par permission (`membership.requireAccess(userId, 'pets:write')`) et non par rôle JWT.

Conséquence pratique : ne jamais déduire un droit d'un `role` côté client. Si un écran doit être masqué faute de permission, s'appuyer sur ce que l'API renvoie (404, 403, ou liste vide), pas sur une supposition locale.

## Conventions

- Mêmes règles que `apps/web` : props typées, un composant par fichier, imports `@/`, TanStack Query.
- Les pages sont volumineuses et regroupent plusieurs sections dans un même fichier (`ShelterAnimalPage` porte fiche, photos, santé, registre, candidatures, adoption). C'est assumé : suivre le voisinage plutôt que d'éclater en dizaines de fichiers.
- Ce back-office est **secondaire** en soin apporté : fonctionnel et clair, sans viser le léché de la vitrine publique.

## Upload de photos

Le fichier ne transite jamais par l'API : `uploadsApi.uploadFile()` (de `@dorloter/client`) demande une URL signée puis dépose directement sur le stockage objet, et seule l'URL publique est enregistrée. Voir la section « Photos » de `ShelterAnimalPage` pour le motif complet (ajout, retrait, désignation de la photo principale).

## Commandes

```bash
bun dev            # Vite dev (proxy /api vers localhost:8080)
bun run build      # typecheck + build prod
bun run typecheck  # tsc --noEmit
```

## Variables d'environnement

```env
VITE_API_PROXY=http://localhost:8080   # cible du proxy /api en dev
```
