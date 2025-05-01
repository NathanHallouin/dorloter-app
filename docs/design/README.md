# Handoff — Refonte « Dorloter » (DA éditoriale / gazette)

## Vue d'ensemble
Refonte complète de l'app web **Dorloter** (repo `dorloter`) : une plateforme d'adoption,
de perdus & trouvés, de pensions, de refuges et de vétérinaires, avec messagerie,
profils membres et back-offices professionnels.

Cette maquette propose une **nouvelle direction artistique** assumée — un parti pris
« **gazette / éditorial** » (serif de presse, libellés mono, filets, angles nets,
palette vert bouteille / ambre / crème / encre) — qui remplace l'ancien thème coral.
Le but du handoff : **recréer ces écrans à l'identique** dans l'app React existante.

## À propos des fichiers de design
Les fichiers de ce paquet sont des **références de design réalisées en HTML/JSX**
(prototypes React via Babel inline + globals sur `window`). **Ce n'est pas du code de
production à copier tel quel.** La tâche consiste à **reproduire ces designs dans
l'environnement du repo** (Next.js App Router + React + Tailwind v4 + shadcn/ui +
lucide-react) en suivant ses conventions, pas à embarquer le HTML.

Le code est volontairement structuré par domaine, ce qui facilite le mapping vers les
`domains/*` et `app/*` du repo.

## Fidélité
**Haute fidélité (hifi).** Couleurs, typographies, espacements, rayons et interactions
sont définitifs. Reproduire l'UI au pixel près en utilisant les composants shadcn et les
patterns du codebase. Les données sont fictives (mock) — à remplacer par les vraies
sources (Drizzle/serveur).

---

## Design tokens

### Palette (mode clair → sombre)
Les variables conservent les **noms existants** du repo (`coral`/`lavande`/`sable`/`prune`)
mais sont **repensées**. Ajout d'une couleur sémantique **brick** (terracotta).

| Rôle | Token | Light | Dark |
|---|---|---|---|
| Primaire (vert bouteille) | `--coral-500/600` | `#1f6f4f` / `#185a40` | `#6fbb91` / `#8fcdaa` |
| Accent (ambre) | `--lavande-500` | `#bf8718` | `#e3b552` |
| Neutres chauds (papier) | `--sable-50/100/200` | `#faf7f0` / `#f3ede1` / `#e6dcc8` | `#141611(bg)` / `#1d211a(card)` / `#343a2c` |
| Profondeur (encre forêt) | `--prune-700/900` | `#1a2c22` / `#0c1610` | idem |
| Sémantique négatif/perdu/urgent (terracotta) | `--brick-500/600` | `#b5482f` / `#963829` | `#d4795f` / `#e09a85` |

Sémantiques : `--background`, `--foreground`, `--card`, `--muted`, `--muted-fg`,
`--border`, `--ring`, plus surfaces teintées `--tint-coral`, `--tint-lavande`, `--tint-prune`
(toutes dark-aware). **Important** : `--sable-50` est une couleur de **texte clair** (sur
boutons verts) — ne jamais l'utiliser comme fond (utiliser `--background`).

Sémantique couleur cohérente sur tout le site :
**vert = primaire / positif / « Trouvé »**, **terracotta = perdu / négatif / favori**,
**ambre = info / mise en avant**, **encre = profondeur (footer, slabs, CTA)**.

### Typographie
- **Titres** : `Newsreader` (serif de presse), weight 600, `letter-spacing: -.01em`. Italique utilisé en accent (`.serif-i`).
- **Texte courant** : `Hanken Grotesk`, 400–700.
- **Libellés / méta / chiffres** : `Geist Mono` (`.mono`), souvent UPPERCASE + `letter-spacing: .04–.16em`.
- Lettrine éditoriale sur le hero (`::first-letter`, serif, `float:left`).
- Échelles indicatives : h1 hero 60px, titres de page 30–40px, h3 carte 19–24px, corps 14–15.5px, méta mono 10–12px.
- Mapping repo : charger via `next/font/google` (Newsreader, Hanken Grotesk, Geist Mono).

### Formes & profondeur
- **Rayons éditoriaux resserrés** : cartes/champs/boutons **4–6 px** (pages publiques),
  jusqu'à 10–12 px sur les surfaces « app » (dashboards, messagerie). Avatars 6–8 px (pas de cercle, sauf petites pastilles).
- **Filets** (hairlines `--border`) et **doubles filets** pour structurer (composant `Rule`).
- Ombres douces et chaudes : `0 14px 36px rgba(20,16,8,.10–.16)`.
- Navbar : **îlot flottant** arrondi 20 px, fond `color-mix(... 86%)` + `backdrop-filter: blur(16px) saturate(1.4)`.

### Composants transverses (voir `ds.jsx`)
- `Icon` — wrapper **lucide** (mêmes noms que `lucide-react`).
- `Logo` — pastille verte + point ambre + mot « dorloter » (serif).
- `Eyebrow` — libellé mono + petit trait (sur-titre de section).
- `Rule` — filet horizontal avec libellé mono centré.
- `Pill` — badge **mono UPPERCASE outline**, tons : coral(vert)/lavande(ambre)/prune/brick/green/sable/white.
- `Btn` — variants `primary`(vert)/`soft`/`outline`/`ghost`/`white`, tailles sm/md/lg, rayon 6px.
- `CompatPills` — compatibilités chats/chiens/enfants (vert OK / terracotta non / sable ?).
- `Marquee`, `Stamp` — fioritures « identité affirmée » (toggle).

---

## Écrans / Vues
Routeur par `view` (string) dans `app.jsx`. Mapping suggéré vers les routes du repo entre parenthèses.

**Public / découverte**
- **home** — Accueil « couverture magazine » : hero serif + lettrine, bande « en chiffres », bandeau défilant, 3 rubriques (Adopter/Perdus/Pensions), « à la une », mode d'emploi. *(/)*
- **adopt** — Catalogue : filtres (espèce, âge, recherche), grille de `PetCard`, boutons « Mode swipe » + « Trouver par quiz ». *(/adopter/liste)*
- **swipe** — Mode swipe façon Tinder : pile de cartes draggables, tampons « Oui » / « Pas pour moi », like/pass/annuler/fiche, raccourcis ←/→/⌫. *(domains/adoption pet-swipe-deck)*
- **quiz** — Quiz de compatibilité : 7 questions, barre de progression, écran de résultats (filtres recommandés). *(/adopter/quiz)*
- **lost** + **reportDetail** — Perdus & trouvés : **carte plein écran** + bandeaux latéraux rétractables (Fiche animal / Flux d'activité), reprend la structure `ReportDetailShell`. *(/perdus-trouves)*
- **pensions** + **reserve** — Annuaire pensions + fiche/réservation (calendrier). *(/pensions)*
- **shelters** + **shelter** — Annuaire refuges + fiche refuge. *(/refuges)*
- **veterinaires** + **vetDetail** — Annuaire vétérinaires + fiche (urgences 24/7, services). *(/veterinaires)*
- **about** — Notre mission (page éditoriale).

**Compte / membre**
- **profile** — **Profil personnel public/privé** : couverture + légende, avatar, badges, bascule visibilité (+ aperçu public, lien partage), stats, onglets **Mes animaux** / **Galerie** (dépôt photo) / Favoris / Candidatures / Paramètres. *(/profil, /mes-animaux)*
- **favorites** — Favoris. **messages** — Messagerie (liste conversations + fil + composer). *(/messages)*
- **login** — Connexion / Inscription. **report** / **apply** — formulaires multi-étapes.

**Back-offices pro** (coquille console à sidebar, sélecteur de rôle)
- **dash** — 4 espaces : **refuge** (annonces, candidatures, adoptions), **pension** (réservations, calendrier, avis), **plateforme/admin** (modération, vérif refuges/pensions/vétos, utilisateurs), **vétérinaire** (scan de puce → rapprochement perdus/trouvés, équipe). *(app/(shelter), (pension), (vet), (admin))*

---

## Navigation (architecture d'information)
Trois zones, à reproduire fidèlement (voir `nav.jsx`) :
1. **Centre — découverte publique** : 3 menus déroulants (mega-menu icône+titre+desc) — **Adopter** / **Perdus & trouvés** / **Annuaires** (Refuges, Pensions, Vétérinaires). État actif = pastille verte ; passe en bouton **burger** ≤ 1024 px.
2. **Droite — personnel** : **recherche globale** (palette de commandes, ouverture ⌘K/Ctrl-K, ↑↓/Entrée/Esc, indexe animaux + pages + prestataires), **Messagerie**, **Notifications** (popover + badge non-lus), **menu compte** (avatar) qui regroupe compte/favoris/candidatures/signalements **+ Espaces professionnels** (refuge/pension/véto/admin avec rôle présélectionné).
3. **Pro** : back-offices isolés dans leur coquille, accessibles uniquement via le menu compte ; chaque espace a « Retour au site ».
- Popovers fermables au clic extérieur ; tout est responsive (panneau mobile structuré : Rechercher / Découvrir / Mon compte / Espaces pro).

## Interactions & comportement
- **Thème clair/sombre** : classe `.dark` sur `<html>`. Tout est dark-aware.
- **Favoris** : store partagé (ici `window.__favs: Set`) → à câbler sur l'action serveur `toggleFavorite`.
- **Swipe** : drag pointer (suivre `draggingRef` pour éviter les races), seuil ±110 px, rotation `clamp(x/18, -16, 16)`, opacité des tampons `clamp((±x-24)/110, 0, 1)`, envol 240 ms puis avance.
- **Quiz** : `computeRecommendation(answers)` → filtres + bullet points (logique identique au repo).
- **Profil** : visibilité publique/privée persistée (`localStorage` → à remplacer par champ user) ; mode aperçu masque les onglets privés et les actions d'édition.
- **Transitions** : 0.14–0.3 s ; **respecter `prefers-reduced-motion`** (animations d'entrée gated, swipe sans tilt).
- **Important (repaint)** : pour les états actifs animés, utiliser le **longhand `background-color`** (le raccourci `background` + `var()` + transition ne repeint pas correctement).

## State management
État local par vue (string `view` + objets sélectionnés : pet, shelterId, pension, vetId, report, dashRole). Dans le repo : remplacer par le **routing Next** (segments + params) et les **server actions** existantes. Données fictives à brancher sur Drizzle.

## Assets
- **Icônes** : lucide (déjà `lucide-react` dans le repo). Les SVG inline de `ds.jsx` reprennent les paths lucide ; utiliser directement les composants lucide-react.
- **Photos** : Unsplash (URLs `images.unsplash.com/photo-…`) — **placeholders** à remplacer par les vraies photos (refuges/animaux). Le composant `<image-slot>` marque les zones d'upload utilisateur (galerie profil).
- **Polices** : Newsreader, Hanken Grotesk, Geist Mono (Google Fonts → `next/font`).

## Fichiers (références de design)
- `Dorloter.html` — point d'entrée (tokens CSS dans `<style>`, ordre de chargement des scripts).
- `ds.jsx` — **système de design** : icônes lucide, primitives (Icon/Logo/Eyebrow/Rule/Pill/Btn/CompatPills/Marquee/Stamp), données mock partagées.
- `nav.jsx` — **navigation globale** (navbar 3 zones, mega-menus, palette ⌘K, popovers compte/notifs, footer).
- `home.jsx` — accueil. `catalog.jsx` — catalogue + `PetCard` + modale fiche animal.
- `swipe.jsx` — mode swipe. `quiz.jsx` — quiz de compatibilité.
- `lost.jsx` — perdus & trouvés (carte + shells). `pensions.jsx` — pensions.
- `vet.jsx` — vétérinaires (annuaire + fiche). `messages.jsx` — messagerie.
- `pages.jsx` — refuges (annuaire + fiche), favoris, à propos, (ancien) compte.
- `profile.jsx` — profil personnel public/privé.
- `ui2.jsx` — en-têtes de page, états vides, données (refuges, user).
- `flows.jsx` — formulaires (signaler, connexion, réservation, candidature).
- `dash.jsx` + `dash-views.jsx` — back-offices pro (kit + 4 espaces).
- `app.jsx` — coquille : routeur de vues, navbar/footer, toast, panneau Tweaks.
- `tweaks-panel.jsx`, `image-slot.js` — utilitaires de prototypage (non nécessaires en prod).

> Pour visualiser l'ensemble : ouvrir `Dorloter.html`. Une version autonome hors-ligne
> peut aussi être générée pour partage.
