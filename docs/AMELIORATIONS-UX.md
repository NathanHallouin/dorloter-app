# Améliorations UX & qualité produit

Document de propositions pour faire passer Dorloter d'un MVP fonctionnel à un produit dont **on a envie de parler à ses proches**. Centré sur l'expérience utilisateur, mais inclut aussi les améliorations de qualité technique qui ont un impact direct sur le ressenti (vitesse, fiabilité, accessibilité).

Les propositions sont classées par **impact perçu × effort** · celles du haut sont à attaquer en priorité.

---

## 1. Onboarding : donner immédiatement de la valeur

### 1.1. Page d'accueil orientée intention, pas catalogue

Aujourd'hui (probable) : la home affiche le catalogue d'animaux. Mais un visiteur arrive avec **une intention précise** : adopter, signaler un perdu, trouver une pension.

**Proposition** : home découpée en 3 grandes cartes d'entrée, plein écran sur mobile :
- 🐾 « Adopter un compagnon » → catalogue
- 📍 « J'ai perdu ou trouvé un animal » → flow signalement avec géoloc auto
- 🏠 « Trouver une pension » → annuaire

Sous ces cartes : indicateurs vivants (« 1 247 chats à adopter », « 89 retrouvailles ce mois », « 142 pensions agréées »). Donne envie, prouve l'utilité.

### 1.2. Pas d'inscription forcée pour explorer

Vérifier que **toutes les pages publiques** (catalogue, fiche animal, annuaire pensions, signalements) sont accessibles sans compte. L'auth ne se déclenche qu'au moment de l'action (favoris, candidater, signaler). Reduce friction.

Quand l'auth se déclenche : modale légère avec **"Continuer en tant qu'invité"** quand c'est possible (ex. on peut signaler un trouvé sans compte si on laisse un téléphone, le compte se crée automatiquement à la confirmation par email).

### 1.3. Quiz de matching « Quel animal pour vous ? »

Court (5-7 questions) : type de logement, présence d'enfants, autres animaux, temps disponible, expérience. À la fin, propose 3-5 animaux compatibles + filtre pré-rempli pour explorer.

C'est ludique, ça donne une raison de revenir, et ça améliore la qualité des candidatures (les refuges reçoivent moins de demandes inadaptées).

### 1.4. Vue « Carte » dès la home pour les signalements

Une mini-carte de France/région sur la home, avec les marqueurs des derniers signalements. Cliquer ouvre la carte plein écran. Démontre instantanément que la plateforme est vivante et géolocalisée.

---

## 2. Adoption : transformer le catalogue en expérience

### 2.1. Mode swipe optionnel (style Tinder), liste par défaut

Le swipe est ludique mais pas pour tout le monde. Toggle visible « Liste / Swipe » en haut du catalogue. En mode swipe :
- 1 carte plein écran avec photo principale + nom + ville
- Swipe droite = favori, swipe gauche = passer, tap = ouvrir la fiche
- Feedback haptique sur mobile (`Haptics.impactAsync` côté Expo, `navigator.vibrate` côté web)
- Annulation possible (« Oups, je voulais favoris »)

### 2.2. Galerie photos riche sur la fiche animal

- Carrousel **swipeable** plein écran, pinch-to-zoom
- Première photo en hero, les suivantes en grille en dessous
- Tap sur une miniature → lightbox plein écran
- Si une seule photo, ne pas afficher le carrousel · pas d'UI inutile

### 2.3. Fiche animal scannable en 3 secondes

Au-dessus du fold : nom, espèce, race, ville, distance depuis l'utilisateur, badge "compatible enfants/chiens/chats" en pictos colorés. L'utilisateur doit pouvoir décider en 3 secondes s'il continue à lire.

Sous le fold : description longue, besoins médicaux, refuge propriétaire, similaires.

### 2.4. Recommandations « Vous pourriez aimer aussi »

En bas de fiche : 3-4 animaux similaires (même espèce, même tranche d'âge, même région). Encourage la sérendipité, fait découvrir des animaux moins « instagrammables » qui resteraient sinon invisibles.

### 2.5. Suivi post-favori intelligent

Quand l'utilisateur met un animal en favori :
- Notification immédiate : « Le refuge X a reçu 3 nouvelles candidatures pour Mistigri cette semaine · n'attendez pas pour candidater si c'est lui »
- Si le statut change (réservé, adopté), notification + animal grisé en favoris avec message touchant : « Mistigri a trouvé sa famille 💛 Découvrez d'autres chats au même refuge ».
- Quand le user n'a pas ouvert l'app depuis 7 jours : digest hebdo des nouveaux animaux dans ses favoris/préférences.

### 2.6. Partage de fiche

Bouton « Partager » sur chaque fiche : génère une URL propre + (côté web) `navigator.share` natif, (côté mobile) sheet de partage native. Le destinataire ouvre la fiche **sans avoir besoin de compte**, avec un CTA « Voir les chats près de chez moi ».

OG tags impeccables (image hero, nom, ville) pour que le lien partagé sur WhatsApp/Messenger affiche une vraie carte produit.

---

## 3. Perdus / Trouvés : le différenciateur

### 3.1. Flow signalement ultra-rapide

L'urgence est le contexte principal. Cible : **moins de 90 secondes** pour publier un signalement.

- Étape 1 : « Perdu ou trouvé ? » + « Chat ou chien ? » (2 taps)
- Étape 2 : Photo (caméra directe), géoloc auto avec confirmation
- Étape 3 : Description en champ libre + date + téléphone
- Validation
- Le reste (race, couleur, signes distinctifs) en optionnel, formulaire enrichi *après* publication

Permettre la **publication progressive** : on peut publier avec le minimum, compléter ensuite. Mieux qu'un formulaire monolithique abandonné en plein milieu.

### 3.2. Carte vivante avec feedback en temps réel

- Marqueurs animés à l'apparition d'un nouveau signalement (pulsation discrète)
- Cluster avec compteur quand zoomé out
- Toggle "Perdus / Trouvés / Tous" + filtre date (24h / 7j / 30j)
- Heatmap optionnelle pour voir les zones chaudes

### 3.3. Notifications de proximité granulaires

Aujourd'hui : rayon en km. À ajouter :
- **Préférence d'horaire** : ne pas notifier la nuit (22h-7h) sauf si l'user est lui-même en signalement actif
- **Regroupement intelligent** : 3 signalements en 1h → 1 notification groupée plutôt que 3
- **Désabonnement temporaire** : « Je pars en vacances 2 semaines, mute »
- **Notification de retrouvailles** : quand un match est confirmé près de chez l'user, notification touchante (« Une famille vient d'être réunie à 2 km de chez vous 💛 »). Renforce le sentiment d'utilité.

### 3.4. Matching présenté comme une recommandation, pas un fait

Sur la page d'un signalement perdu, afficher les matches potentiels avec **un score honnête** :
- « 92 % de similarité · distance 800 m, même couleur, taille proche » (vert)
- « 64 % de similarité · distance 4 km, race différente mais même âge » (jaune)
- Jamais « MATCH TROUVÉ ! » triomphal · l'utilisateur est en détresse, le faux espoir fait mal.

Boutons d'action clairs : « Contacter » (révèle le téléphone), « Pas mon animal » (rejette la suggestion, améliore l'algo).

### 3.5. Page « Tableau de bord retrouvailles »

Stats publiques en page d'accueil et footer : « 1 247 retrouvailles facilitées en 2026 ». Chaque retrouvaille génère une story (avec consentement) sur le blog : photo avant/après, témoignage. Crée l'attachement émotionnel et le SEO.

### 3.6. Anti-arnaque et qualité des signalements

- **Vérification téléphone** au signalement (SMS de confirmation gratuit). Évite les faux signalements.
- **Modération soft** : photos passées dans NSFWJS (déjà dans les deps) avant publication.
- **Détection de doublons** : si l'user signale au même endroit dans la même heure, suggérer de modifier l'existant plutôt que d'en créer un nouveau.
- **Badge "vérifié"** sur les utilisateurs qui ont déjà résolu une retrouvaille (lié à `gamification`).

### 3.7. QR code médaillons (différenciateur fort)

Permettre à un adoptant de générer un **QR code unique** pour son animal, à mettre sur le médaillon ou collier. Si quelqu'un trouve l'animal :
- Scan → page publique minimaliste avec photo + prénom + bouton « Contacter le propriétaire »
- Le propriétaire reçoit une notif géolocalisée immédiate
- Pas besoin pour le finder de créer un compte ni d'installer l'app

C'est un produit en soi qui pourrait monétiser (médaillons gravés vendus 5-10 €).

---

## 4. Pensions : annuaire utile, pas vitrine

### 4.1. Filtres pertinents en haut

Les pros cherchent ces critères : type d'animal accepté, prix max/jour, distance, services (médicaments, transport). Filtres en sticky bar en haut de l'annuaire, pas dans un menu caché.

### 4.2. Comparateur jusqu'à 3 pensions

Sélection par checkbox, vue côte à côte des prix, services, photos, avis. Évite à l'utilisateur d'ouvrir 5 onglets.

### 4.3. Système d'avis vérifiés

À ne pas négliger pour un annuaire pro. Avis laissés uniquement par des users qui ont contacté la pension via la plateforme (lien click-to-call ou mail tracké). Note 1-5 + commentaire texte. Modération a posteriori.

### 4.4. CTA téléphonique direct

Sur mobile, gros bouton « 📞 Appeler » qui ouvre directement le composeur. Tracker l'événement (sans tracker le numéro composé) pour stats. C'est le besoin réel des pros.

---

## 5. Notifications : utiles, jamais polluantes

### 5.1. Centre de notifications in-app riche

- Tri chronologique inversé
- Groupement par type (matches, candidatures, refuges suivis)
- Action rapide depuis la notif (« Voir le match », « Marquer comme lue », « Contacter »)
- Marquer toutes comme lues
- Filtres : non lues seulement / tout

### 5.2. Préférences fines

Page paramètres avec toggle par type :
- Matches perdus/trouvés (push + email)
- Mise à jour candidature (push + email)
- Nouveau chat dans un refuge suivi (push uniquement)
- Digest hebdo (email uniquement)
- Newsletter (email opt-in séparé)

Chaque user contrôle. Pas d'opt-in caché. Bouton "tout désactiver sauf urgent" en haut.

### 5.3. Microcopy chaleureuse

Mauvais : « Vous avez 1 nouvelle correspondance ».
Bon : « 🐾 Mistigri pourrait être votre Felix perdu · il est à 800 m. Voulez-vous le contacter ? »

Toutes les notifs sont rédigées comme un voisin bienveillant, pas comme un système.

---

## 6. Confiance & sécurité perçue

### 6.1. Vérification refuges visible

Badge "Refuge vérifié par Dorloter" sur les pages refuges et dans le footer des fiches animaux. Lien "Comment Dorloter vérifie ?" → page dédiée expliquant le process (SIRET, certificat, contact direct).

### 6.2. Page « Signaler un abus » accessible partout

Lien dans le footer de chaque fiche : signaler une fiche douteuse, une pension non agréée, un comportement inapproprié. Une fois soumis, le user voit le statut de son signalement (en cours / traité). Donne du pouvoir à la communauté.

### 6.3. RGPD irréprochable

- Bandeau cookies minimaliste (juste "OK", pas de dark pattern), si vraiment nécessaire · ou mieux, **pas de tracker du tout** au lancement (Plausible self-hosted = pas de cookie nominatif).
- Page « Exporter mes données » et « Supprimer mon compte » accessibles en 2 clics depuis le profil.
- Politique de confidentialité courte, en français normal (pas du juridique).

### 6.4. Anonymisation des contacts

Sur les signalements, ne pas afficher le téléphone en clair → bouton « Contacter » qui révèle après captcha invisible. Évite le scraping et les démarchages.

---

## 7. Performance & ressenti technique

### 7.1. Images responsive et `loading="lazy"`

- `<img srcset>` avec tailles précises sur chaque card → économise des Mo
- Format AVIF ou WebP servi automatiquement
- Placeholder `blur` (LQIP) généré au build
- Photos dans S3 stockées en plusieurs tailles (thumbnail 320px, medium 800px, full 1920px) · génération à l'upload, pas à la volée

### 7.2. Skeleton loaders, jamais de spinner plein écran

À chaque navigation, afficher la structure de la page avec des blocs gris animés. Plus rapide perçu que le spinner. Avec React Router (loaders + Suspense) et les états `isPending` de TanStack Query, c'est trivial à mettre en place dans la SPA Vite.

### 7.3. PWA solide pour la version web

- Service worker qui cache les assets et les dernières fiches consultées (consultation offline)
- Manifest correct, icône maskable (déjà présente)
- Prompt d'installation **non intrusif** (bouton dans le menu, pas une bannière qui couvre la page)
- Notifications push offline supportées

### 7.4. Lighthouse > 90 partout

À mesurer en CI :
- Performance > 90
- Accessibilité > 95
- SEO > 95
- Best practices > 95

Lighthouse CI dans GitHub Actions avec seuils. Un PR qui dégrade un score ne merge pas.

---

## 8. Accessibilité

### 8.1. Contrastes AA (WCAG 2.2)

Tous les textes doivent passer le ratio 4.5:1 en clair et en sombre. Tester avec `axe-core` en e2e. Couleurs chaleureuses ne signifient pas faibles contrastes · l'ambre sur crème peut être insuffisant.

### 8.2. Navigation clavier complète

- Focus visible (anneau coloré net)
- Skip-link en haut de page (« Aller au contenu »)
- Tous les boutons et liens accessibles au Tab
- Modales : focus trap, Esc pour fermer

### 8.3. Lecteurs d'écran

- `aria-label` sur tous les boutons-icônes
- `aria-live` pour les toasts de retrouvailles
- Photos : `alt` rédigé (pas juste "photo de Mistigri", mais "Mistigri, chat tigré gris assis sur un canapé")
- Carte : alternative liste textuelle pour qui ne peut pas utiliser la carte

### 8.4. Respect des préférences système

- `prefers-reduced-motion` → désactiver animations swipe et transitions
- `prefers-color-scheme` → dark mode auto
- `prefers-contrast` → variant haut contraste

---

## 9. Engagement & rétention

### 9.1. Profil utilisateur vivant

Page profil affiche :
- Animaux favoris (avec statut)
- Candidatures en cours et passées
- Signalements actifs et résolus
- Refuges suivis
- Badges (premier signalement, premier match, première adoption…)

C'est une fierté, ça donne envie de revenir.

### 9.2. Témoignages d'adoption (déjà dans le schéma)

Bien exploités :
- Section dédiée sur la home (« Ils ont trouvé leur compagnon »)
- Photo avant/après, courte interview, lien vers le refuge
- Refuges peuvent solliciter le témoignage 1 mois après l'adoption (workflow auto)
- Partageable, OG tags impeccables

### 9.3. Suivi des refuges (déjà dans le schéma)

Bouton « Suivre ce refuge » sur chaque page refuge. Le user reçoit :
- Notif quand un nouvel animal est ajouté
- Newsletter mensuelle du refuge si le refuge en publie une

### 9.4. Gamification douce, pas Candy Crush

- Badge « Sauveteur » : a aidé à 1 retrouvaille
- Badge « Éclaireur » : 5 signalements valides
- Badge « Famille » : a adopté un animal
- Pas de points, pas de leaderboard public, pas de FOMO

---

## 10. Détails qui font la différence

- **Confettis** ou animation discrète quand une candidature est acceptée
- **Microsons** subtils en option (swipe favori, signalement publié)
- **Citations** rotatives en footer (« Un chat n'est pas un cadeau, c'est un engagement de 15 ans »)
- **Easter egg** : taper "miaou" 5 fois sur la page d'accueil fait défiler des ronrons
- **Dark mode soigné** : pas juste invertir, vraies couleurs nocturnes (terre cuite → terre brûlée, crème → graphite)
- **404 émouvante** : un chat perdu sur fond de carte avec « Cette page s'est perdue. Vous avez essayé Adopter ? »
- **Loading messages variés** : « On caresse le chat... », « On prépare la croquette... » au lieu de "Chargement..."
- **Empty states illustrés** : pas de "Aucun résultat", mais une illustration et une suggestion (« Aucun chat dans ce rayon · élargissez à 50 km ? »)

---

## 11. Quick wins (faisables ce mois-ci)

1. ✅ **Skeleton loaders** sur catalogue et fiches (1 jour)
2. ✅ **Filtres en sticky bar** sur catalogue mobile (1 jour)
3. ✅ **Bouton partager** sur fiche animal (½ jour)
4. ✅ **OG tags** soignés sur toutes les pages (1 jour)
5. ✅ **Préférences notifications granulaires** (2 jours)
6. ✅ **Galerie lightbox** sur fiche animal (1 jour)
7. ✅ **Empty states** illustrés (1 jour)
8. ✅ **Microcopy** review complète (1 jour avec un coup d'œil extérieur)
9. ✅ **Lighthouse CI** dans GitHub Actions (½ jour)
10. ✅ **axe-core** en e2e Playwright (½ jour)

**Soit ~10 jours de travail pour un saut qualitatif majeur** sans toucher à l'architecture.

---

## 12. Investissements moyens (1-2 mois)

- Quiz de matching adoption
- QR codes médaillons (différenciateur)
- Vérification téléphone signalements
- Comparateur pensions
- Système d'avis vérifiés
- Suivi post-adoption avec stories
- PWA offline solide

---

## 13. Investissements lourds (3-6 mois)

- App mobile native
- Feed communautaire de témoignages
- Module bénévolat / parrainage
- Module dons aux refuges
- API publique pour partenaires (vétérinaires, fourrières)

---

## 14. Synthèse

Le MVP est solide techniquement. Les 3 axes qui transformeront l'expérience :

1. **Émotion** · chaque écran doit donner envie d'agir, pas juste d'informer. Microcopy chaleureuse, illustrations, témoignages, empty states soignés.
2. **Vitesse perçue** · skeleton loaders, images optimisées, PWA offline, Lighthouse > 90. L'utilisateur doit sentir que l'app est vivante.
3. **Confiance** · vérifications visibles, RGPD irréprochable, modération réactive, anti-arnaque. Le sujet (animaux perdus, adoption) est émotionnellement chargé : l'app doit inspirer un sérieux absolu.

Le différenciateur produit reste le **matching perdu/trouvé**. Tout investissement qui le rend plus précis, plus rapide, plus émouvant (stories de retrouvailles, QR médaillons, notifications granulaires) creuse l'écart avec la concurrence.
