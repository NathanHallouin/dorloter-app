# Roadmap V2 · Dorloter

> Document de planification long-terme. Liste les évolutions au-delà du MVP
> pour faire de Dorloter **la plateforme française de référence** pour
> l'adoption, les retrouvailles, et la gestion des refuges. Les choix
> techniques privilégient la **souveraineté européenne** (Scaleway, Hetzner,
> OVH).
>
> Pas un engagement ni un planning ferme · un inventaire ordonné des
> pistes à creuser, avec leurs trade-offs et leur valeur perçue.

---

## Cadrage philosophique

Trois principes structurent les choix V2 :

1. **Souveraineté** · stack et services hébergés en Europe, données qui ne
   sortent pas du territoire. Pas d'AWS, pas de GCP, pas de Cloudflare en
   primary.
2. **Pragmatisme** · chaque feature doit apporter une valeur immédiate et
   mesurable. Pas de surcouche technique « parce que c'est cool ».
3. **Frugalité** · on tire au maximum sur les briques déjà en place
   (Postgres/PostGIS + API + auth JWT + Resend + Web Push). Tant que la
   base utilisateurs n'a pas trouvé son public, **zéro coût externe ajouté**.

---

## Partie 2 · Outils refuges avancés

### 2.1 · Gestion médicale animal ⭐⭐⭐

**Valeur** : très haute. Demande forte du terrain refuge.

**Comment** :

- Nouvelle table `pet_medical_events` :
  - FK pet, type (`vaccin`, `vermifuge`, `antiparasitaire`,
    `consultation`, `chirurgie`, `traitement`, `autre`)
  - Date effective, date prochain rappel (si applicable)
  - Vétérinaire associé (FK véto Dorloter ou texte libre)
  - Notes, fichier joint (ordonnance scan)
- Calendrier dans `/shelter-animaux/[id]/sante` :
  - Timeline visuelle
  - Alertes « Prochains rappels » (sidebar dashboard refuge)
  - Export PDF « Carnet de santé » (compatible adoption, fourni à l'adoptant)
- **Intégration cabinet vétérinaire Dorloter** : si le refuge a sélectionné
  un véto partenaire, ce véto voit le carnet de santé et peut ajouter des
  entrées directement.

**Effort** : moyen (3-4 semaines).

---

### 2.2 · Gestion stocks alimentaires ⭐⭐

**Valeur** : moyenne, demande de plusieurs refuges. Différenciant.

**Comment** :

- Nouvelle table `shelter_food_inventory` :
  - FK shelter, type (`croquettes chat`, `croquettes chien`, `pâtée`, ...),
    marque, quantité en kg, péremption, fournisseur
  - Historique mouvements (entrées dons, sorties consommation)
- Tableau de bord stocks `/shelter-stocks` :
  - Vue actuelle (stock, péremption à venir, alertes seuil bas)
  - Saisie rapide d'entrée/sortie
  - Graphique consommation par mois (espèce, marque)
- **Page publique de besoins** (`/refuges/[slug]/besoins`) : affiche les
  stocks bas pour attirer les dons. Bouton « Faire un don de nourriture »
  avec liste précise des besoins.

**Effort** : moyen (2-3 semaines).

---

### 2.3 · Gestion bénévoles et planning ⭐⭐

**Valeur** : moyenne à haute pour les refuges actifs.

**Comment** :

- Nouveau rôle utilisateur : `shelter_volunteer` (accès limité, par
  invitation d'un shelter_admin).
- Calendrier `/shelter-planning` :
  - Créneaux récurrents (balades chiens lundi 14h-16h, soins chats samedi
    matin)
  - Inscription bénévole en libre service
  - Validation par admin refuge
  - Comptage heures par bénévole
- Messagerie groupe bénévoles (réutilisation domain messaging existant).
- Application mobile (Expo) : check-in arrivée, prises de notes terrain.

**Effort** : élevé (4-6 semaines).

---

### 2.4 · Gestion familles d'accueil (FA) ⭐⭐

**Valeur** : moyenne. Modèle hybride associatif courant.

**Comment** :

- Nouveau rôle : `foster_family` (FA bénévole, validée par refuge).
- Profil FA : capacité d'accueil, espèces, restrictions (pas de chien avec
  chat existant, etc.).
- Placement d'un animal en FA : table `pet_foster_placements` (FK pet, FK
  FA, dates début/fin prévue, statut).
- Communication FA ↔ refuge via messagerie.
- Vue refuge « Animaux en FA actuels » sur dashboard.

**Effort** : moyen (3-4 semaines).

---

### 2.5 · Vitrine « Soutenir » avec liens externes ⭐⭐

**Valeur** : moyenne. Dorloter ne gère pas la collecte ni les reçus
fiscaux (trop lourd réglementairement, déjà bien couvert par des
plateformes spécialisées). Le refuge garde la main complète sur sa
collecte, Dorloter se contente d'aiguiller.

**Comment** :

- Section « Soutenir » sur la fiche refuge `/refuges/[slug]` :
  - Lien direct vers la plateforme de don du refuge (HelloAsso, Dons
    solidaires, page Stripe Atlas, virement bancaire... configuré dans
    le profil refuge).
  - Bouton CTA visible mais non intrusif.
  - Mention de l'URL et avantage fiscal (le refuge déclare lui-même la
    déductibilité dans son profil).
- Pas de PSP intégré, pas de reçu fiscal généré, pas de dashboard
  donateur dans Dorloter.
- Tracking d'intention optionnel (clic sur « Faire un don » loggé pour
  les stats refuge, sans suivi de conversion réelle).

**Effort** : faible (3-5 jours, surtout un champ de profil + composant
de présentation).

---

### 2.6 · Suivi post-adoption ⭐⭐ · LIVRÉ

**Valeur** : moyenne. Différenciant pour les refuges sérieux.

**Comment** :

- Quand une candidature passe en `acceptee` et que l'animal est
  effectivement adopté, déclencher un workflow de suivi automatique :
  - J+15 : email « Comment se passe l'adaptation ? »
  - J+90 : invitation à publier un témoignage public + photo
  - J+365 : email anniversaire + invitation à parrainer un autre animal
- Le refuge voit l'historique du suivi sur la fiche de l'adoption.
- Témoignages publiés : alimentation directe de la home.

**État** : livré (table `adoption_followups`, trigger sur acceptation,
cron `/api/cron/send-adoption-followups`).

---

### 2.7 · Statistiques refuge avancées ⭐⭐ · LIVRÉ

**Valeur** : moyenne. Aide à la décision pour les refuges.

**Comment** :

- Tableau de bord `/shelter-stats` enrichi :
  - Durée moyenne entre publication et adoption, par profil animal
  - Taux de conversion (candidatures reçues → adoptions effectives)
  - Animaux « en difficulté de placement » (> 90 jours, peu de
    candidatures), suggestion de booster leur visibilité
  - Activité 30 derniers jours, histogramme adoptions sur 12 mois
- Graphiques CSS pure, alertes actionnables (candidatures sans réponse).

**État** : livré.

---

## Partie 3 · Outils adoptants

### 3.1 · Carnet de santé numérique post-adoption ⭐⭐

**Valeur** : haute. Outil de fidélisation.

**Comment** :

- Réutilise le module `pet_medical_events` créé pour les refuges (point
  2.1).
- À l'adoption, le carnet de santé du refuge est **transféré** au compte
  adoptant.
- L'adoptant continue à ajouter ses propres entrées (visites véto post-
  adoption).
- Connexion possible au cabinet vétérinaire Dorloter du suivi (carnet
  partagé).
- Export PDF, rappels automatiques (vaccins annuels, vermifuge mensuel).

**Effort** : faible si 2.1 est fait (1 semaine d'extension).

---

### 3.2 · Calculateur de coûts d'adoption ⭐

**Valeur** : faible mais cohérent avec la philosophie pédagogique du
projet.

**Comment** :

- Outil interactif sur `/adopter/coute-combien` :
  - Espèce, race, âge, taille
  - Région (coût véto variable)
  - Niveau de soin souhaité (basique / premium)
- Affiche estimation mensuelle + annuelle (croquettes, véto, accessoires,
  toilettage, assurance).
- Sources publiques citées (SACPA, fédérations vétos).

**Effort** : faible (1 semaine). Le hub `/avant-d-adopter` couvre déjà
une partie du contenu sous forme de tableaux statiques.

---

### 3.3 · Programme parrainage symbolique ⭐⭐

**Valeur** : moyenne. Engagement long-terme sans adoption.

**Comment** :

- L'utilisateur peut « parrainer » un animal d'un refuge (engagement
  symbolique, sans flux financier dans Dorloter).
- Reçoit en retour : nouvelles régulières (photos, anecdotes du refuge),
  badge profil « Parrain de [animal] ».
- Le refuge poste 1-2 updates / mois sur l'animal parrainé via le panel.
- Possibilité de visiter l'animal (prise de RDV intégrée, point 8.2.3).
- Lien vers la plateforme de don du refuge (cf. 2.5) pour matérialiser
  le soutien financier hors Dorloter.

**Effort** : moyen (2 semaines, sans la couche financière).

---

## Partie 4 · Perdus/trouvés améliorés

### 4.1 · Génération PDF d'affiche imprimable ⭐⭐⭐ · LIVRÉ

**Valeur** : haute. Demandée explicitement.

**Comment** :

- Bouton « Télécharger l'affiche » sur la fiche signalement.
- Génération via `window.print()` + `@page` CSS dynamique selon format
  (A4, A5, A6, sticker).
- QR code SVG inline (lib `qrcode-svg`) vers la fiche en ligne.
- 4 layouts adaptés au format.

**État** : livré (route `/perdus-trouves/[id]/affiche`).

---

### 4.2 · Diffusion automatique aux vétos du secteur ⭐⭐⭐

**Valeur** : haute. Levier différenciant si on a une base véto active.

**État actuel** : panel véto avec `search_radius_km`, log RGPD prêt.

**Comment** :

- À la création d'un signalement (perdu ou trouvé), trouver tous les
  cabinets vétos dans un rayon de 30 km autour du lieu du signalement.
- Push de notification + email aux comptes véto admins concernés.
- Lien direct vers la fiche dans leur panel `/vet-recherche-signalements`.
- Compteur « X vétos alertés » visible dans le flux d'activité de la fiche.

**Effort** : moyen (2 semaines). Le pattern listener event-bus existe.

---

### 4.3 · Intégration ICAD ⭐⭐⭐

**Valeur** : très haute. Crédibilité administrative.

**Comment** :

- Si le signalement contient un numéro de puce :
  - Vérification du fichier ICAD (Identification des Carnivores Domestiques)
  - Affichage statut « puce enregistrée » côté Dorloter
  - Notification automatique au propriétaire si une correspondance est trouvée
- Si Dorloter devient partenaire officiel ICAD :
  - Pour les comptes véto : ajout au workflow standard
- Si API publique pas disponible : juste un lien et un guide explicatif.

**Effort** : variable. À investiguer commercialement avant tech.

---

### 4.4 · Photo piège virtuelle ⭐

**Valeur** : faible (cas d'usage rare) mais « wow » marketing.

**Comment** :

- L'auteur du signalement demande à un voisin de partager une caméra de
  porte ou une vieille tablette.
- Page `/perdus-trouves/[id]/camera-piege` : interface webcam simple qui
  capture une photo quand un mouvement est détecté.
- Notification au propriétaire en temps réel (« Mouvement détecté à
  18h32 »).

**Effort** : moyen (2-3 semaines).

**Trade-off** : très niche. À ne faire qu'après tout le reste.

---

## Partie 5 · Communauté et engagement

### 5.1 · Espace témoignages structuré ⭐⭐

**Valeur** : moyenne. Renforce la confiance plateforme.

**Comment** :

- Page `/temoignages` avec navigation par refuge, par espèce, par durée
  depuis adoption.
- Témoignages « vérifiés » : l'adoptant a bien candidaté + été accepté + a
  attendu 3+ mois pour publier (déjà calculable, on a `adoption_followups`).
- Fonction de « like » + partage.

**Effort** : faible (1-2 semaines). Le domain testimonials existe.

---

### 5.2 · Notifications push hyper-localisées intelligentes ⭐⭐

**Valeur** : moyenne. Améliore l'engagement.

**Comment** :

- L'utilisateur reçoit déjà des push à proximité (perdus-trouvés, nouveau
  animal dans son rayon).
- Étendre avec un digest hebdomadaire « Nouveautés dans votre rayon » :
  3 animaux à adopter récemment publiés, choisis par compatibilité
  (basée sur les filtres des recherches sauvegardées de l'utilisateur,
  ou son profil quiz).
- Préférences granulaires (déjà existantes) à étendre avec un toggle
  spécifique au digest.

**Effort** : faible (1 semaine, infra push + saved-searches déjà en place).

---

### 5.3 · Forum d'entraide ⭐

**Valeur** : faible. Risque de modération.

**Comment** :

- Espace `/communaute` avec catégories (Adoption récente, Aide
  comportement, Perdus/trouvés, Bénévolat).
- Modération humaine via file admin existante.

**Effort** : élevé (4-6 semaines). À reporter sauf demande forte.

---

## Partie 6 · Mobile et natif

### 6.1 · App mobile native (Expo) finalisée ⭐⭐⭐

**État actuel** : `apps/mobile` initialisé avec Expo, scripts WSL/Android.
Login + favoris + signalement déjà en E2E.

**Comment** :

- Compléter les écrans manquants :
  - Panel refuge mobile (minimum dashboard + candidatures)
  - Panel véto mobile (recherche signalements)
  - Carnet de santé adoptant
- Publication App Store / Play Store.
- Mise à jour OTA via Expo EAS.

**Effort** : élevé (6-12 semaines selon ambition).

---

### 6.2 · Notifications push natives (au-delà du Web Push) ⭐⭐

**Valeur** : haute pour l'engagement mobile.

**Comment** :

- Intégration Firebase Cloud Messaging (FCM) ou OneSignal **EU-hosted**.
- Tokens déjà gérés via `device_tokens` table.
- Templates : nouvelle correspondance, message reçu, mise à jour
  candidature.

**Effort** : faible (1 semaine).

---

## Partie 8 · Features productivité pure

Toutes ces features apportent de la valeur opérationnelle sans dépendance
externe lourde.

### 8.1 · Outils refuges quotidiens

#### 8.1.1 Templates de réponses candidatures ⭐⭐⭐ · LIVRÉ

Bibliothèque de templates de réponses pré-rédigés par catégorie
(acceptation, refus, demande d'infos, RDV, générique) avec variables
auto-remplies `{{prenomCandidat}}`, `{{nomAnimal}}`, `{{nomRefuge}}`.
Page `/shelter-parametres-templates` + sélecteur dans le flow accept/refus
des candidatures.

#### 8.1.2 QR code physique par animal ⭐⭐⭐ · LIVRÉ

Fiche cage imprimable (A5/A6/sticker) avec QR code pointant vers
`/adopter/[id]`. Layouts adaptés, status badges, compatibility pills.
Route `/shelter-animaux/[id]/fiche-cage`.

#### 8.1.3 Étiquettes/tags personnalisés ⭐⭐

**Valeur** : moyenne. Demande des refuges sérieux.

**Comment** :

- Chaque refuge définit jusqu'à 10 tags (nom + couleur, ex. « urgent »,
  « besoins FA », « comportement délicat »).
- Tags assignés à un animal en M2M.
- Tags visibles en interne sur `/shelter-animaux` (filtre + badges).
- Une partie des tags peut être publique (toggle), affichée sur la fiche
  publique (badge discret).

**Effort** : faible (1 semaine).

#### 8.1.4 Système de réservation avec acompte ⭐ · HORS SCOPE

Initialement prévu pour réduire les no-show de candidatures via un
acompte remboursable. Retiré du périmètre Dorloter : dépend d'une
intégration PSP que la plateforme ne souhaite pas internaliser. Les
refuges qui le souhaitent peuvent gérer ce volet via leur propre
plateforme de paiement et le mentionner dans leur conversation avec
l'adoptant.

#### 8.1.5 Import CSV massif depuis l'ancien outil ⭐⭐

**Valeur** : haute pour l'onboarding refuge.

**Comment** :

- Page `/shelter-import` : upload CSV avec mapping interactif des colonnes.
- Templates pour les outils courants (Filalapat, Petfinder export).
- Import des photos via URL ou archive ZIP.
- Validation + preview + commit.

**Effort** : moyen (2-3 semaines). Clé pour convertir des refuges déjà
équipés.

#### 8.1.6 Tableau de bord adoptable / pré-adoptable ⭐⭐

**Valeur** : moyenne. Permet aux refuges de gérer leurs animaux en
observation avant publication.

**Comment** :

- Nouveau statut `pre_adoptable` (ou champ `visibility` enum
  `public` / `interne`).
- Le statut est invisible côté public mais visible côté refuge.
- Tab dédié dans `/shelter-animaux` pour les animaux en observation.
- Bouton « Publier » qui passe `pre_adoptable` → `disponible`.

**Effort** : faible (1 semaine).

#### 8.1.7 Espace documents refuge ⭐⭐

**Valeur** : moyenne. Sécurise la documentation administrative.

**Comment** :

- Upload de fichiers PDF / images (statuts association, agréments,
  conventions, contrats d'adoption type).
- Stockage S3 / Scaleway Object Storage.
- Visibilité : interne au refuge OU partagée avec adoptants validés.
- Génération de contrats d'adoption à partir de templates Markdown +
  données animal.

**Effort** : moyen (1-2 semaines).

#### 8.1.8 Suivi des transferts inter-refuges ⭐⭐

**Valeur** : moyenne. Pratique courante (réseau de refuges qui s'échangent
des animaux selon places dispos).

**Comment** :

- Initier un transfert depuis la fiche animal (refuge A → refuge B).
- Refuge B reçoit notification + accepte.
- Transfert tracé dans l'historique de l'animal.
- L'animal passe sous la responsabilité de B (changement de `shelter_id`).

**Effort** : moyen (2 semaines).

#### 8.1.9 Communication mass-email aux abonnés ⭐⭐

**Valeur** : moyenne. Engagement des followers du refuge.

**Comment** :

- Page `/shelter-newsletter` : composeur Markdown simple.
- Envoi à tous les utilisateurs qui ont follow le refuge.
- Templates : « Nouvel arrivage », « Urgence FA », « Appel aux dons ».
- Statistiques d'ouverture / clic.

**Effort** : moyen (2-3 semaines).

### 8.2 · Outils adoptants

#### 8.2.1 Comparateur d'animaux côte à côte ⭐⭐ · LIVRÉ

Page `/adopter/compare` : sélection de 3 animaux max via toggle sur les
cards, affichage tableau côte à côte (photo, espèce, âge, sexe,
compatibilités, race, statut).

#### 8.2.2 Alertes sur recherche sauvegardée ⭐⭐⭐ · LIVRÉ

Bouton « Enregistrer cette recherche » sur les listings (catalogue
adoption, perdus/trouvés). Stockage table `saved_searches` (params JSON,
frequency). Cron quotidien `/api/cron/saved-searches-digest` qui compare
avec les nouvelles fiches publiées et envoie un email digest. Tableau de
bord `/profil/recherches` pour gérer (renommer, pause, supprimer).

#### 8.2.3 Pré-rendez-vous visite refuge ⭐⭐⭐ · LIVRÉ

Le refuge configure ses créneaux disponibles dans
`/shelter-parametres-creneaux` (grille 7j × 22 demi-heures). Bouton
« Réserver une visite » sur fiche animal → page `/adopter/[id]/rdv` avec
créneaux dispos sur 14 jours. Page refuge `/shelter-rdv` pour voir,
confirmer, annuler. Email rappel J-1 (cron horaire).

#### 8.2.4 Hub « Avant d'adopter » ⭐⭐ · LIVRÉ

Section `/avant-d-adopter` :
- 5 questions auto-évaluation (suis-je prêt·e ?)
- Tableau des coûts par poste (chat / chien)
- Checklist matériel par espèce
- Idées reçues débunkées
- Témoignages d'adoptants

#### 8.2.5 Calculateur trajet + coût visite refuge ⭐

**Valeur** : faible mais aide à la décision quand un animal est loin.

**Comment** :

- Sur une fiche animal, depuis l'adresse de l'utilisateur (déjà en DB) →
  calcul distance routière + estimation temps + coût essence/péage
  (formule simple).
- API publique gratuite : Open Source Routing Machine (OSRM) ou
  GraphHopper (open source EU).

**Effort** : 1 semaine.

### 8.3 · Public général et exposition

#### 8.3.1 Carte France interactive des acteurs ⭐⭐⭐ · LIVRÉ

Page `/carte` : carte MapLibre plein écran avec toggles 5 layers
(refuges, pensions, vétos, perdus, trouvés). Cluster, popup avec lien
fiche. Panneau de contrôle gauche avec compteurs et filtre « vérifiés
uniquement ».

#### 8.3.2 Stats publiques temps réel ⭐⭐ · LIVRÉ

Page `/stats` : tableau de bord public avec animaux à adopter,
adoptions facilitées, retrouvailles confirmées, écosystème (pensions,
vétos, refuges), histogramme 12 mois des retrouvailles.

#### 8.3.3 Blog / actualités refuges ⭐⭐

**Valeur** : moyenne. SEO + engagement.

**Comment** :

- Section `/actualites` (refuges peuvent publier articles).
- Templates simples (titre, image, texte markdown, type : adoption,
  événement, urgence, témoignage).
- Modération : auto-publication pour refuges vérifiés, file modo pour les
  autres.
- Flux RSS automatique.

**Effort** : 2-3 semaines.

#### 8.3.4 Calendrier d'événements adoption ⭐⭐

**Valeur** : moyenne. Engagement communauté.

**Comment** :

- Refuges et pensions publient leurs événements (portes ouvertes, courses
  caritatives, salons animaliers).
- Page `/evenements` avec carte + filtres date + zone.
- Notifs push aux utilisateurs proches d'un événement à venir.

**Effort** : 1-2 semaines.

#### 8.3.5 Espace presse / kit média ⭐ · LIVRÉ

Page `/presse` avec stats temps réel, logos SVG (4 variants), palette,
mission, baseline reprenable. Footer link.

### 8.4 · Perdus/trouvés (compléments)

#### 8.4.1 Mode « guetteur » / veille de zone ⭐⭐⭐

**Valeur** : haute. Engagement durable.

**Comment** :

- Largement couvert par `8.2.2 Alertes sur recherche sauvegardée` :
  l'utilisateur peut sauvegarder une veille « perdus/trouvés dans X km
  autour de Y » et reçoit un digest dès qu'un nouveau signalement
  matche.
- Reste à faire : push notification (plus immédiate que email pour
  l'urgence « animal vu en bas de chez moi »).
- Toggle « me notifier en push pour cette recherche » sur les saved
  searches de type `lost-found`.
- Réutilise `push_subscription` et le domain notifications.

**Effort** : faible (1 semaine, extension du système saved-searches).

#### 8.4.2 Affiche imprimable multi-formats ⭐⭐ · LIVRÉ

Voir 4.1.

#### 8.4.3 Carte des retrouvailles passées ⭐⭐ · LIVRÉ

Page `/perdus-trouves/retrouvailles/carte` : carte avec pin sur chaque
lieu où un animal perdu a été retrouvé (anonymisé : juste un point + date
+ espèce). Layer sur la carte principale possible mais non implémenté.

#### 8.4.4 Mode rassemblement (battue communautaire) ⭐

**Valeur** : faible (cas niche) mais marquant.

**Comment** :

- L'auteur d'un signalement perdu peut organiser une « battue » :
  - Date + lieu de rendez-vous + briefing
  - Inscription des volontaires
  - Chat de coordination le jour J
- Limitation : 1 par utilisateur par signalement (anti-abus).

**Effort** : 2-3 semaines (chat + coordination).

### 8.5 · Qualité, accessibilité, conformité

#### 8.5.1 Multi-langue (i18n) ⭐⭐

**Valeur** : moyenne (frontaliers, expats), forte sur le long terme.

**Comment** :

- Migration vers `next-intl` ou `paraglide-next` (souverain européen).
- Locales prioritaires : `fr` (défaut), `en`, `de` (frontaliers allemands
  / suisses), `es` (frontaliers espagnols).
- Traduction des UI labels + métadonnées SEO.
- Pas de traduction automatique du contenu utilisateur.

**Effort** : 3-4 semaines.

#### 8.5.2 Accessibilité renforcée ⭐⭐

**Valeur** : moyenne. Conformité RGAA 4.1 nécessaire pour les marchés
publics.

**Comment** :

- Audit complet RGAA 4.1 (interne ou prestataire).
- Correction systématique des écarts.
- Page `/accessibilite` avec déclaration de conformité.
- Tests automatisés `axe-core` dans la CI.

**Effort** : 2-3 semaines.

#### 8.5.3 API publique pour partenaires ⭐

**Valeur** : faible court-terme, levier long-terme.

**Comment** :

- API REST publique read-only sur `/api/v1` :
  - Refuges vérifiés
  - Animaux à adopter (filtres)
  - Signalements actifs
- Documentation OpenAPI + portail développeur.
- Clés d'API + rate limiting.
- Cas d'usage : agrégateurs, sites de fédérations vétos, applis tierces.

**Effort** : 2-3 semaines.

### 8.6 · Monétisation soft (sans pub intrusive)

#### 8.6.1 Affiliations marques pet food européennes ⭐⭐

**Valeur** : moyenne à haute, dépend du volume.

**Comment** :

- Partenariats avec marques EU éthiques (Yarrah, Edgard & Cooper, etc.).
- Liens d'affiliation sur le hub « Avant d'adopter », les fiches animal.
- Transparence totale : badge « partenaire Dorloter » visible.
- Pas de pubs display, pas de tracking tiers.

**Effort** : surtout commercial.

#### 8.6.2 Premium refuge ⭐⭐

**Valeur** : modèle économique durable.

**Comment** :

- Option payante (ex. 30 €/mois) pour les refuges avec :
  - Statistiques avancées + comparatifs régionaux
  - Mass-emails aux followers illimités
  - Templates de réponses illimités (vs 10 en gratuit)
  - Templates contrats d'adoption avec signature électronique
  - Support prioritaire
- Refuges < 50 animaux : gratuit (philosophie inclusive).
- Paiement de l'abonnement via un PSP léger (Stripe / Stancer) dédié
  uniquement aux abonnements Premium, pas aux dons aux refuges.

**Effort** : 1-2 semaines.

#### 8.6.3 Marketplace solidaire ⭐⭐

**Valeur** : moyenne, dépend du volume.

**Comment** :

- Petites annonces de matériel d'occasion lié aux animaux (cages,
  arbres à chat, harnais).
- Vente entre particuliers, Dorloter ne prend pas de commission.
- Option de don du matériel à un refuge plutôt que vente.
- Modération forte (pas d'animaux vivants vendus, jamais).

**Effort** : 4-6 semaines.

#### 8.6.4 Campagne « animal en besoin » avec lien externe ⭐

**Valeur** : faible à moyenne. Aiguillage vers les plateformes de
crowdfunding existantes pour les frais lourds d'un animal précis.

**Comment** :

- Champ optionnel sur la fiche animal : URL d'une campagne de collecte
  (HelloAsso, Leetchi, Ulule...) avec un texte court de présentation.
- Affichage d'un encart « Aider à payer ses soins » sur la fiche
  publique, avec lien sortant et badge de transparence (montant
  collecté + objectif, alimenté manuellement par le refuge).
- Pas de PSP intégré, pas de tracking de conversion.

**Effort** : faible (3-5 jours).

---

## Partie 9 · Considérations techniques transverses

### 9.1 · RGPD et transparence

- Documentation des sous-traitants (Resend pour les emails, Scaleway
  pour l'hébergement, etc.) dans le registre.
- Option utilisateur dans `/parametres/confidentialite` :
  - Désactiver les emails marketing (digests, anniversaires)
  - Exporter toutes ses données (JSON)
  - Supprimer son compte (RGPD article 17)
- Tableau de bord admin avec demandes RGPD entrantes.

### 9.2 · Performances continues

- Surveillance p95 sur les pages clés (analytics auto-hébergé type
  Plausible, cf. souveraineté EU).
- Cap sur le nombre de requêtes DB par page (objectif < 10).
- Mise en cache HTTP + fallback gracieux sur toutes les pages publiques
  agrégeant des stats (`/`, `/stats`, `/carte`, sitemap).

### 9.3 · Sauvegardes et résilience

- Sauvegarde Postgres quotidienne (Supabase point-in-time recovery
  inclus).
- Test de restauration mensuel.
- Documentation `docs/DISASTER-RECOVERY.md` avec runbook.

---

## Priorisation suggérée

### Phase 1 · Quick wins refuge (4-6 semaines) · TERMINÉE

Objectif : améliorer ce qui est déjà là sans gros effort.

1. **8.1.1 Templates de réponses candidatures** ✅
2. **8.1.2 QR code physique par animal** ✅
3. **4.1 + 8.4.2 PDF affiche multi-formats** ✅
4. **2.6 Suivi post-adoption** ✅
5. **2.7 Statistiques refuge avancées** ✅
6. **8.2.1 Comparateur d'animaux côte à côte** ✅
7. **8.3.5 Espace presse** ✅

### Phase 1.5 · Engagement et acquisition (en cours)

Objectif : mobiliser la communauté et faire grandir la base utilisateurs.

1. **8.2.2 Alertes sur recherche sauvegardée** ✅
2. **8.2.3 Pré-rendez-vous visite refuge** ✅
3. **8.3.1 Carte France interactive des acteurs** ✅
4. **8.3.2 Stats publiques temps réel** ✅
5. **8.4.1 Mode « guetteur » / veille de zone** (1 sem, extension push
   des saved-searches lost-found)
6. **8.4.3 Carte des retrouvailles passées** ✅
7. **8.2.4 Hub « Avant d'adopter »** ✅

### Phase 2 · Outils refuges sérieux (8-12 semaines)

Objectif : devenir l'outil métier de référence.

1. **2.1 Gestion médicale animal** (3-4 sem)
2. **2.2 Gestion stocks alimentaires** (2-3 sem)
3. **2.5 Vitrine « Soutenir » avec liens externes** (3-5 jours)
4. **3.1 Carnet de santé post-adoption** (1 sem, dépend de 2.1)
5. **4.2 Diffusion auto aux vétos du secteur** ✅
6. **8.1.3 Étiquettes/tags personnalisés** ✅
7. **8.1.5 Import CSV massif** (2-3 sem), clé pour l'onboarding refuges
8. **8.1.6 Tableau de bord pré-adoption** ✅

### Phase 3 · Engagement long-terme (variable)

1. **3.3 Programme parrainage symbolique** (2 sem)
2. **8.6.4 Campagne « animal en besoin » avec lien externe** (3-5 jours)
3. **8.1.9 Communication mass-email** (2-3 sem)
4. **8.3.3 Blog / actualités refuges** (2-3 sem)
5. **8.3.4 Calendrier d'événements** (1-2 sem)
6. **2.3 Gestion bénévoles** (4-6 sem)
7. **2.4 Familles d'accueil** (3-4 sem)
8. **5.1 Témoignages structurés** (1-2 sem)
9. **5.2 Notifications push hyper-localisées** (1 sem)
10. **4.3 Intégration ICAD** (à investiguer commercialement d'abord)
11. **8.1.7 Espace documents refuge** (1-2 sem)
12. **8.1.8 Suivi transferts inter-refuges** (2 sem)

### Phase 4 · Mobile, scale, monétisation soft (variable)

1. **6.1 App mobile finalisée** (6-12 sem)
2. **6.2 Push natifs** (1 sem)
3. **8.5.1 Multi-langue i18n** (3-4 sem)
4. **8.5.2 Accessibilité RGAA 4.1** (2-3 sem)
5. **8.6.1 Affiliations marques pet food EU** (variable, surtout
   commercial)
6. **8.6.2 Premium refuge** (1-2 sem)
7. **8.6.3 Marketplace solidaire** (4-6 sem)
8. **8.5.3 API publique pour partenaires** (2-3 sem)
9. **8.4.4 Mode rassemblement (battue)** (2-3 sem, niche)
10. **8.2.5 Calculateur trajet** (1 sem)
11. **3.2 Calculateur de coûts d'adoption** (1 sem)
12. **4.4 Photo piège virtuelle** (2-3 sem, niche)

---

## Hors scope explicite

Ce qui **n'est pas** dans cette V2 :

- **IA et embeddings** : retiré du périmètre. Pas de Mistral, Ollama,
  pgvector, sentence-transformers, recommandations LLM, etc. La
  plateforme reste pleinement déterministe.
- **Collecte de dons et reçus fiscaux** : retiré du périmètre. Dorloter
  n'intègre pas de PSP, ne stocke pas de transactions financières, ne
  génère pas de reçus fiscaux. Les refuges gèrent leur collecte via
  HelloAsso, Dons solidaires, Stripe, virement direct, etc. Dorloter
  se limite à aiguiller le donateur vers la plateforme du refuge.
- **Microservices** : on reste sur le monolithe modulaire actuel (API
  à bounded contexts).
- **Cache Redis** : pas nécessaire avant d'avoir > 10k utilisateurs actifs.
- **Service de search externe** (Algolia, Meili) : Postgres full-text
  suffit.
- **Notifications SMS** : coût élevé, push + email suffisent.
- **Vidéo en direct** des refuges : trop niche.
- **Crypto / NFT** : pas dans la philosophie.
- **Intégration AWS / Google Cloud** : souveraineté UE non négociable.

---

## Métriques de succès V2

À surveiller pour valider l'impact des features livrées :

- **Adoption** : nombre d'adoptions effectives par mois, durée moyenne
  publication → adoption.
- **Perdus/trouvés** : taux de résolution, time-to-match moyen.
- **Refuges actifs** : nombre de refuges qui se connectent au moins
  1x/semaine.
- **NPS adoptants** : enquête trimestrielle.
- **Performances** : p95 < 500 ms sur les pages clés (déjà tracking).
- **Engagement saved searches** : taux d'ouverture des digests emails,
  taux de clic.
- **RDV refuges** : ratio confirmé / no-show.

---

*Document vivant. À mettre à jour à chaque arbitrage produit majeur.*
