# Roadmap V2 · Dorloter — IA souveraine + outils refuges avancés

> Document de planification long-terme. Liste les évolutions au-delà du MVP
> pour faire de Dorloter **la plateforme française de référence** pour
> l'adoption, les retrouvailles, et la gestion des refuges. Les choix
> techniques privilégient la **souveraineté européenne** (Mistral AI,
> Scaleway, Hetzner, OVH).
>
> Pas un engagement ni un planning ferme — un inventaire ordonné des
> pistes à creuser, avec leurs trade-offs et leur valeur perçue.

---

## Cadrage philosophique

Quatre principes structurent les choix V2 :

1. **Gratuit au démarrage** · zéro coût d'API IA tant que la plateforme n'a
   pas trouvé son public. On utilise des **modèles open-weights auto-hébergés**
   (Mistral 7B Instruct ou Phi-3 Mini sur la VPS prod) et **sentence-transformers
   multilingues** pour les embeddings. Migration éventuelle vers l'API Mistral
   « La Plateforme » seulement quand le volume le justifie.
2. **Souveraineté** · stack et services hébergés en Europe, données qui ne
   sortent pas du territoire. **Mistral AI** (Paris) reste la référence si on
   passe sur API hébergée. **pgvector** (PostgreSQL) pour stocker les
   embeddings, pas de service tiers.
3. **Pragmatisme** · chaque feature IA doit avoir un **fallback déterministe**
   pour fonctionner si le service IA est down ou si l'utilisateur refuse
   l'envoi de données.
4. **Frugalité** · les appels LLM sont **mis en cache aggressivement**, limités
   par utilisateur, et déclenchés à la demande (jamais sur scroll). Objectif :
   coût IA = **0 €/mois** en phase 0 (auto-hébergé), puis < 5 €/mois pour 1 000
   utilisateurs actifs si bascule sur API payante.

### Approche progressive coûts

| Phase | Stack IA | Coût mensuel | Quand passer à la suivante |
|---|---|---|---|
| **0 — Gratuit** | Ollama (Mistral 7B Instruct quantifié Q4) + sentence-transformers multilingual sur la VPS prod | **0 €** (juste la VPS qu'on a déjà) | Quand latence > 5 s par requête ou besoin d'un modèle plus puissant que 7B |
| **1 — Tier gratuit cloud** | Mistral La Plateforme (essai gratuit) ou Cloudflare Workers AI (free tier) en fallback | **0 €** dans les limites du tier | Quand on dépasse la quota gratuit en volume |
| **2 — API payante mesurée** | Mistral API (`mistral-small-latest`, `mistral-embed`) | **< 5 €/1k MAU** | Si on monte en volume sérieux (> 100k req/mois) |
| **3 — Hybride scale** | Mistral Large pour les requêtes critiques (matching, génération) + Mistral Small pour le reste | Variable | Optimisation continue |

---

## Partie 1 · Intégration IA (Mistral)

### 1.1 — Matching adoptant ↔ animal personnalisé ⭐⭐⭐

**Valeur** : haute. C'est le différenciateur produit le plus visible.

**Comment** :

- Enrichir le profil utilisateur (en plus de `notification_radius_km`) :
  - Logement (appartement / maison, taille, jardin)
  - Mode de vie (sédentaire / actif, télétravail, voyages fréquents)
  - Foyer (autres animaux, enfants, âges)
  - Expérience (premier animal / habitué)
  - Préférences caractère (calme / joueur, indépendant / pot-de-colle, etc.)
  - Contraintes (allergies, budget, temps disponible)
- Stockage : table `user_adoption_profile` (FK users, jsonb pour rester
  flexible).
- **Embedding du profil** + **embedding de chaque animal** via
  `sentence-transformers` local (phase 0) ou `mistral-embed` (phase 2+).
  Stocké en `pgvector` (colonne `pets.profile_embedding`).
- **Recherche par similarité cosinus** pour pré-trier les animaux candidats.
- **Re-ranking par LLM** sur le top 20 — explication courte personnalisée
  ("Rocky te convient car : ton mode de vie actif matche son besoin
  d'exercice, et ton expérience avec un golden permet d'anticiper son
  éducation"). LLM local Mistral 7B Instruct (phase 0) ou Mistral Small
  cloud (phase 2+).
- Affichage : page `/adopter/pour-moi` ou widget dashboard.

**Fallback** : matching déterministe sur critères structurés (race, taille,
compatibilité enfants/animaux/jardin) — pas d'embedding.

**Données envoyées au modèle** : profil anonymisé (pas de nom/email/ID),
description publique des animaux. **En phase 0 (auto-hébergé)**, rien ne
quitte la VPS. RGPD : log local des prompts.

---

### 1.2 — Quiz adoptant conversationnel ⭐⭐

**Valeur** : moyenne. Améliore le quiz statique existant (`/adopter/quiz`).

**Comment** :

- Au lieu de 7 questions fixes, conversation pilotée par le LLM
  (Mistral 7B local en phase 0, Mistral Large cloud si on a besoin de
  conversation très naturelle).
- Le LLM pose 4-6 questions adaptatives selon les réponses précédentes.
- À la fin, il génère un **profil texte** + sélectionne 3-5 animaux du
  catalogue avec justification courte.
- Côté UI : chat-like minimal, pas de complexité.

**Trade-off** : plus engageant mais coût en RAM/CPU (phase 0) ou en
tokens API (phase 2+). À limiter (1 quiz/jour/IP anonyme, plus pour les
comptes connectés).

**Fallback** : quiz statique existant.

---

### 1.3 — Génération assistée des fiches animal ⭐⭐⭐

**Valeur** : haute pour les refuges (gain de temps + qualité homogène).

**Comment** :

- Sur `/shelter-animaux/new` ou `/shelter-animaux/[id]/edit`, bouton
  **"Aide à la rédaction"** :
  - L'utilisateur saisit quelques notes (3-4 phrases brutes)
  - Le LLM génère une description engageante, structurée, sans cliché
  - Auto-fill de signes distinctifs, compatibilités (l'utilisateur valide
    case par case)
- Détection automatique de qualité d'une fiche : **badge "À compléter"**
  déjà existant (basé sur règles), enrichi par un score LLM ("La fiche est
  trop courte / vague / similaire à 3 autres animaux du refuge").

**Données envoyées au modèle** : notes brutes du refuge (pas de PII),
retour = description publique. **En phase 0 (auto-hébergé)**, rien ne
quitte la VPS. Sortie validable avant publication par le refuge.

**Fallback** : pas d'IA disponible → le bouton n'apparaît pas.

---

### 1.4 — Matching signalements perdu/trouvé enrichi par embeddings ⭐⭐⭐

**Valeur** : haute. C'est le différenciateur technique du projet et il y a
beaucoup à améliorer.

**État actuel** : matching score 0-100 sur (distance + couleur + race +
sexe + fenêtre temporelle). Pas de prise en compte des descriptions libres.

**Comment** :

- Embedding de la `description` + `distinctive_signs` de chaque signalement
  via `sentence-transformers` local (phase 0).
- Stocké en `reports.description_embedding` (pgvector, dim selon modèle).
- Au matching, calcul cosinus entre les embeddings → composante "similarité
  textuelle" (0-15 pts ajoutés au score actuel, pondérée plus faible que la
  distance qui reste reine).
- Recalcul async à chaque création / édition (job ou listener event-bus).

**Coût** : nul en phase 0 (CPU/RAM uniquement, modèles légers <100 Mo).

**Fallback** : matching actuel sans embedding (déjà bon).

---

### 1.5 — Reconnaissance d'animal à partir d'une photo ⭐⭐

**Valeur** : moyenne. Très "wow" mais cas d'usage limité.

**Comment** :

- À l'upload d'une photo dans `/signaler` (perdu/trouvé) ou
  `/shelter-animaux/new`, appel à un modèle vision :
  - **Phase 0 (gratuit)** : `microsoft/resnet-50` ou
    `google/vit-base-patch16-224` (classifieur ImageNet auto-hébergé via
    `@huggingface/transformers` ou sidecar Python) — détecte espèce et
    grandes catégories de race.
  - **Phase 2+ (cloud)** : Pixtral (Mistral) ou modèle vision dédié pour
    une qualité supérieure (signes distinctifs précis).
- Sortie : espèce probable, race probable (top 3), couleur dominante,
  signes visibles (collier, taille pelage).
- L'utilisateur valide / corrige.

**Trade-off** : latence ~3-5 s par photo en phase 0 (CPU). À déclencher
au moment de l'upload, en async (non bloquant), avec un placeholder UI.

**Fallback** : aucun pré-remplissage, l'utilisateur saisit tout.

---

### 1.6 — Modération automatique des contenus texte ⭐⭐

**Valeur** : moyenne, soulage la file de modération admin.

**État actuel** : modération NSFW images via `nsfwjs` (local). Modération
texte = humaine via signalements communauté.

**Comment** :

- Avant publication d'une description, d'un sighting, d'un témoignage :
  classifier léger qui détecte :
  - Insultes, harcèlement
  - Mention de vente d'animaux (interdit hors refuges)
  - Spam (liens externes suspects)
  - Données perso d'autrui (numéro, adresse précise sans consentement)
- **Phase 0** : règles regex + Mistral 7B local en quelques shots ; ou
  modèle dédié `unitary/toxic-bert` (open-source).
- **Pas de blocage automatique** (faux positifs trop coûteux) : juste pré-
  remplissage de la file de modération + score de confiance.

**Fallback** : modération communautaire actuelle (signalement + admin).

---

### 1.7 — Chatbot d'aide RAG ⭐

**Valeur** : faible à moyenne. Très visible mais utilisation rare.

**Comment** :

- Index RAG de la documentation publique + FAQ + CGU avec embeddings
  `sentence-transformers` (phase 0).
- Widget chat sur `/aide` (à créer) qui répond aux questions courantes
  via Mistral 7B local.
- Sources citées dans chaque réponse.

**Trade-off** : ROI faible vs coût build + maintenance. À reporter sauf si
le support utilisateur devient un poids.

---

### 1.8 — Génération de conseils contextuels sur la fiche signalement ⭐⭐

**Valeur** : moyenne. Améliore l'utilité de la fiche actuelle.

**État actuel** : `ReportTipsBanner` propose 4 conseils statiques selon
(type, daysActive).

**Comment** :

- Le LLM (Mistral 7B local) génère 1-2 conseils supplémentaires
  personnalisés selon :
  - Race (un Border Collie qui fuit demande des conseils différents d'un
    persan d'intérieur)
  - Environnement (ville dense / campagne)
  - Météo locale du jour (canicule, gel) via API publique gratuite
    (Open-Meteo)
  - Heure de disparition (jour / nuit)
- Cache par (race, env, météo) pour limiter le CPU.

**Fallback** : conseils statiques existants.

---

## Partie 2 · Outils refuges avancés

### 2.1 — Gestion médicale animal ⭐⭐⭐

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
  - Alertes "Prochains rappels" (sidebar dashboard refuge)
  - Export PDF "Carnet de santé" (compatible adoption — fourni à l'adoptant)
- **Intégration cabinet vétérinaire Dorloter** : si le refuge a sélectionné
  un véto partenaire, ce véto voit le carnet de santé et peut ajouter des
  entrées directement.

**Effort** : moyen (3-4 semaines). Pas d'IA requis.

---

### 2.2 — Gestion stocks alimentaires ⭐⭐

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
- **Estimation besoins** (IA optionnel) : Mistral prédit la consommation
  des 30 prochains jours selon historique + nombre d'animaux actuels
  ("Vous aurez besoin de 45 kg croquettes chats supplémentaires d'ici fin
  juin").
- **Page publique de besoins** (`/refuges/[slug]/besoins`) : affiche les
  stocks bas pour attirer les dons. Bouton "Faire un don de nourriture"
  avec liste précise des besoins.

**Effort** : moyen (2-3 semaines). L'IA est un plus, pas le cœur.

---

### 2.3 — Gestion bénévoles et planning ⭐⭐

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

**Effort** : élevé (4-6 semaines). Pas d'IA.

---

### 2.4 — Gestion familles d'accueil (FA) ⭐⭐

**Valeur** : moyenne. Modèle hybride associatif courant.

**Comment** :

- Nouveau rôle : `foster_family` (FA bénévole, validée par refuge).
- Profil FA : capacité d'accueil, espèces, restrictions (pas de chien avec
  chat existant, etc.).
- Placement d'un animal en FA : table `pet_foster_placements` (FK pet, FK
  FA, dates début/fin prévue, statut).
- Communication FA ↔ refuge via messagerie.
- Vue refuge "Animaux en FA actuels" sur dashboard.

**Effort** : moyen (3-4 semaines).

---

### 2.5 — Gestion dons + reçus fiscaux ⭐⭐⭐

**Valeur** : très haute. Monétisation indirecte du refuge.

**Comment** :

- Intégration PSP européen (**Stancer** ou **Stripe France**) pour les dons.
- Page publique `/refuges/[slug]/soutenir` avec :
  - Don ponctuel ou mensuel
  - Affectation libre ou ciblée ("Pour les frais vétos de Rocky")
  - Témoignage post-don
- Génération auto du reçu fiscal article 200 du CGI (PDF à télécharger,
  envoyé par email).
- Dashboard donateurs (`/profil/dons`) avec historique et reçus.
- Côté refuge : tableau de bord dons reçus, top donateurs, campagnes.

**Effort** : élevé (4-6 semaines) — surtout pour la partie reçu fiscal
conforme et la PSP.

**Modèle économique** : Dorloter ne prend pas de commission sur les dons
aux refuges (souveraineté philosophie). Coûts couverts par sponsoring
ou option premium refuge (point 4.3).

---

### 2.6 — Suivi post-adoption ⭐⭐

**Valeur** : moyenne. Différenciant pour les refuges sérieux.

**Comment** :

- Quand une candidature passe en `acceptee` et que l'animal est
  effectivement adopté, déclencher un workflow de suivi automatique :
  - J+15 : email "Comment se passe l'adaptation ?"
  - J+90 : invitation à publier un témoignage public + photo
  - J+365 : email anniversaire + invitation à parrainer un autre animal
- Le refuge voit l'historique du suivi sur la fiche de l'adoption.
- Témoignages publiés : alimentation directe de la home (déjà existante).

**Effort** : faible (1-2 semaines) — réutilise emails et témoignages.

---

### 2.7 — Statistiques refuge avancées ⭐⭐

**Valeur** : moyenne. Aide à la décision pour les refuges.

**Comment** :

- Tableau de bord `/shelter-stats` enrichi :
  - Durée moyenne entre publication et adoption, par profil animal
  - Taux de conversion (candidatures reçues → adoptions effectives)
  - Animaux "en difficulté de placement" (> 6 mois, peu de vues, peu de
    candidatures) — suggestion de booster leur visibilité
  - Comparaison régionale anonymisée (les refuges peuvent comparer leurs
    taux à la moyenne régionale)
- Graphiques (recharts ou similaire, déjà en stack possible).

**Effort** : faible à moyen (2 semaines).

---

## Partie 3 · Outils adoptants

### 3.1 — Carnet de santé numérique post-adoption ⭐⭐

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

### 3.2 — Calculateur de coûts d'adoption ⭐

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

**Effort** : faible (1 semaine, pas d'IA).

---

### 3.3 — Programme parrainage ⭐⭐

**Valeur** : moyenne. Engagement long-terme sans adoption.

**Comment** :

- L'utilisateur peut "parrainer" un animal d'un refuge (don mensuel
  affecté à cet animal).
- Reçoit en retour : nouvelles régulières (photos, anecdotes du refuge),
  badge profil "Parrain de [animal]".
- Le refuge poste 1-2 updates / mois sur l'animal parrainé via le panel.
- Possibilité de visiter l'animal (prise de RDV intégrée).

**Effort** : moyen (3 semaines). Dépend de 2.5 (gestion dons).

---

## Partie 4 · Perdus/trouvés améliorés

### 4.1 — Génération PDF d'affiche imprimable ⭐⭐⭐

**Valeur** : haute. Demandée explicitement, vue dans les screenshots.

**Comment** :

- Bouton "Télécharger l'affiche" sur la fiche signalement.
- Génération côté serveur (lib `pdfme` ou `pdf-lib`) :
  - Format A4 portrait
  - Photo principale grande
  - Nom, type, race, couleur, signes distinctifs
  - QR code vers la fiche `/perdus-trouves/[id]`
  - Coordonnées (révélées avec consentement de l'auteur)
- Personnalisation : choix template (urgent, sobre, illustré).

**Effort** : faible (1 semaine).

---

### 4.2 — Diffusion automatique aux vétos du secteur ⭐⭐⭐

**Valeur** : haute. Levier différenciant si on a une base véto active.

**État actuel** : panel véto avec `search_radius_km`, log RGPD prêt.

**Comment** :

- À la création d'un signalement (perdu ou trouvé), trouver tous les
  cabinets vétos dans un rayon de 30 km autour du lieu du signalement.
- Push de notification + email aux comptes véto admins concernés.
- Lien direct vers la fiche dans leur panel `/vet-recherche-signalements`.
- Compteur "X vétos alertés" visible dans le flux d'activité de la fiche.

**Effort** : moyen (2 semaines). Le pattern listener event-bus existe.

---

### 4.3 — Intégration ICAD ⭐⭐⭐

**Valeur** : très haute. Crédibilité administrative.

**Comment** :

- API officielle ICAD (i-cad.fr) — vérifier les conditions d'accès
  (probablement réservé aux vétos et associations agréées).
- Si possible :
  - Vérification d'une puce électronique en 1 clic depuis la fiche
    signalement
  - Si match propriétaire ICAD : déclenche notification email/SMS au
    propriétaire enregistré
  - Pour les comptes véto : ajout au workflow standard
- Si API publique pas disponible : juste un lien et un guide explicatif.

**Effort** : variable. À investiguer commercialement avant tech.

---

### 4.4 — Photo piège virtuelle ⭐

**Valeur** : faible (cas d'usage rare) mais "wow" marketing.

**Comment** :

- L'auteur du signalement demande à un voisin de partager une caméra de
  porte ou une vieille tablette.
- Page `/perdus-trouves/[id]/camera-piege` : interface webcam simple qui
  capture une photo quand un mouvement est détecté.
- Notification au propriétaire en temps réel ("Mouvement détecté à
  18h32").

**Effort** : moyen (2-3 semaines).

**Trade-off** : très niche. À ne faire qu'après tout le reste.

---

## Partie 5 · Communauté et engagement

### 5.1 — Espace témoignages structuré ⭐⭐

**Valeur** : moyenne. Renforce la confiance plateforme.

**Comment** :

- Page `/temoignages` avec navigation par refuge, par espèce, par durée
  depuis adoption.
- Témoignages "vérifiés" : l'adoptant a bien candidaté+été accepté+a
  attendu 3+ mois pour publier.
- Fonction de "like" + partage.

**Effort** : faible (1-2 semaines). Le domain testimonials existe.

---

### 5.2 — Notifications push hyper-localisées intelligentes ⭐⭐

**Valeur** : moyenne. Améliore l'engagement.

**Comment** :

- L'utilisateur reçoit déjà des push à proximité (perdus-trouvés, nouveau
  animal dans son rayon).
- Ajouter "Animaux qui correspondent à votre profil" : push hebdomadaire
  avec les 3 top animaux du matching IA (point 1.1).
- Préférences granulaires (déjà existantes) à étendre.

**Effort** : faible (déjà infra push).

---

### 5.3 — Forum d'entraide ⭐

**Valeur** : faible. Risque de modération.

**Comment** :

- Espace `/communaute` avec catégories (Adoption récente, Aide
  comportement, Perdus/trouvés, Bénévolat).
- Modération auto par 1.6 + modération humaine via file admin existante.

**Effort** : élevé (4-6 semaines). À reporter sauf demande forte.

---

## Partie 6 · Mobile et natif

### 6.1 — App mobile native (Expo) finalisée ⭐⭐⭐

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

### 6.2 — Notifications push natives (au-delà du Web Push) ⭐⭐

**Valeur** : haute pour l'engagement mobile.

**Comment** :

- Intégration Firebase Cloud Messaging (FCM) ou OneSignal **EU-hosted**.
- Tokens déjà gérés via `device_tokens` table.
- Templates : nouvelle correspondance, message reçu, mise à jour
  candidature.

**Effort** : faible (1 semaine).

---

## Partie 8 · Features sans IA (productivité pure)

Toutes ces features apportent de la valeur sans dépendre du LLM. À
considérer en parallèle ou avant la phase IA selon les priorités produit.

### 8.1 — Outils refuges quotidiens

#### 8.1.1 Templates de réponses candidatures ⭐⭐⭐

**Valeur** : très haute. Gain de temps massif pour les admins refuge qui
répondent souvent les mêmes choses.

**Comment** :
- Bibliothèque de templates par refuge (`shelter_response_templates`) :
  acceptation, refus poli, demande d'infos complémentaires, RDV proposé.
- Variables dynamiques `{{prenomCandidat}}`, `{{nomAnimal}}`,
  `{{lienVisio}}`, etc.
- Bouton "Répondre avec template" sur chaque candidature.
- Templates partageables : un admin refuge peut publier ses templates en
  open source pour les autres refuges.

**Effort** : 1-2 semaines.

#### 8.1.2 QR code physique par animal ⭐⭐⭐

**Valeur** : haute. Outil terrain concret.

**Comment** :
- Sur chaque fiche animal, génération auto d'un QR code qui pointe vers
  `/adopter/[id]`.
- Bouton "Imprimer fiche cage" : génère un PDF A6 avec photo + nom + QR.
- Les visiteurs scannent → voient la fiche complète sur leur téléphone,
  candidatent en ligne sans formulaire papier.

**Effort** : 1 semaine.

#### 8.1.3 Étiquettes/tags personnalisés ⭐⭐

**Valeur** : moyenne à haute. Organisation interne.

**Comment** :
- Nouvelle table `shelter_pet_tags` : tags libres par refuge
  ("Quarantaine", "Salle médicale", "Box 7", "Convalescent").
- Affichés en pills sur la liste `/shelter-animaux`, filtrables.
- **Privés au refuge** (jamais visibles côté adoptant).

**Effort** : 1 semaine.

#### 8.1.4 Système de réservation avec acompte ⭐⭐

**Valeur** : haute pour les refuges qui voient des candidatures "non
suivies d'effet" trop souvent.

**Comment** :
- Quand une candidature passe en `acceptee`, possibilité de demander un
  **acompte remboursable** (50 €) via Stancer/Stripe FR.
- Si l'adoption se concrétise → acompte déduit des frais d'adoption.
- Si désistement → soit remboursé, soit reversé au refuge (config refuge).
- Lutte contre les abandons de candidature de dernière minute.

**Effort** : 3-4 semaines (intégration PSP, conditions juridiques).

#### 8.1.5 Import CSV massif depuis l'ancien outil ⭐⭐

**Valeur** : critique pour l'onboarding de nouveaux refuges qui ont déjà
des données ailleurs.

**Comment** :
- Outil `/shelter-import` : template CSV téléchargeable, mapping colonnes,
  preview avant import, dry-run.
- Import : animaux, photos URL, candidatures, FA.
- Logs détaillés d'erreurs ligne par ligne.

**Effort** : 2-3 semaines.

#### 8.1.6 Tableau de bord adoptable / pré-adoptable ⭐⭐

**Valeur** : moyenne. Reflète la réalité du terrain : tous les animaux ne
sont pas immédiatement publiables.

**Comment** :
- Nouveau statut animal : `pre_adoption` (entre `disponible` et le brouillon).
- Liste séparée dans `/shelter-animaux?status=pre_adoption` (animaux en
  observation, en quarantaine, en sociabilisation).
- Pas visible côté adoptant.
- Workflow : `pre_adoption` → `disponible` (publication) → `reserve` →
  `adopte`.

**Effort** : 1 semaine.

#### 8.1.7 Espace documents refuge ⭐⭐

**Valeur** : moyenne. Centralise les pièces administratives.

**Comment** :
- Nouveau onglet `/shelter-documents` :
  - Statuts associatifs, agréments (PDF)
  - Contrat type d'adoption (édité par le refuge, partagé avec adoptants
    au moment de la validation)
  - Conditions générales d'adoption spécifiques au refuge
  - Récépissés préfecture
- Upload + versionning + dates de validité (alerte si expiré).

**Effort** : 1-2 semaines.

#### 8.1.8 Suivi des transferts inter-refuges ⭐⭐

**Valeur** : moyenne. Les animaux changent parfois de structure.

**Comment** :
- Action "Transférer cet animal vers un autre refuge" sur la fiche.
- Si refuge destinataire sur Dorloter : transfert avec accord (workflow
  bilatéral).
- Sinon : marquage `transferred_out` avec note.
- Historique de l'animal préservé (le carnet de santé suit).

**Effort** : 2 semaines.

#### 8.1.9 Communication mass-email aux abonnés ⭐⭐

**Valeur** : moyenne. Les refuges ont des newsletters à envoyer.

**Comment** :
- Système `shelter_followers` déjà existant.
- Outil `/shelter-communication` : composition email (markdown), preview,
  envoi planifié, taux d'ouverture (tracking).
- Templates pré-faits (nouvelle annonce, urgence, événement, bilan annuel).
- Conformité opt-in (RGPD).

**Effort** : 2-3 semaines.

### 8.2 — Outils adoptants

#### 8.2.1 Comparateur d'animaux côte à côte ⭐⭐

**Valeur** : moyenne. Outil de décision quand on hésite entre 2-3.

**Comment** :
- Le pattern existe déjà pour les pensions (`/pensions/compare`).
- Décliner pour les animaux : sélection (case à cocher sur les cards),
  bouton "Comparer (3)" en flottant, page `/adopter/compare` avec tableau
  côte à côte (photo, espèce, race, âge, sexe, compatibilités, distance,
  refuge).

**Effort** : 1 semaine (réutilisation pattern existant).

#### 8.2.2 Alertes sur recherche sauvegardée ⭐⭐⭐

**Valeur** : très haute. Engagement automatique.

**Comment** :
- Bouton "Enregistrer cette recherche" sur les listings (catalogue
  adoption, perdus/trouvés).
- Stockage : table `saved_searches` (FK user, params JSON, frequency).
- Job cron quotidien : pour chaque recherche, compare avec les nouvelles
  fiches publiées depuis hier. Si match → email + push.
- Tableau de bord `/profil/recherches` pour gérer.

**Effort** : 2-3 semaines.

#### 8.2.3 Pré-rendez-vous visite refuge ⭐⭐⭐

**Valeur** : haute. Sécurise les visites côté adoptant et refuge.

**Comment** :
- Le refuge configure ses créneaux disponibles dans `/shelter-profil`
  (récurrents par jour de semaine).
- Sur une fiche animal, bouton "Réserver une visite" → assistant qui
  propose les créneaux disponibles → confirmation par email.
- Calendrier refuge `/shelter-rdv` : voir, valider, déplacer, annuler.
- Email rappel J-1 avec adresse et règles de visite.

**Effort** : 2-3 semaines.

#### 8.2.4 Hub "Avant d'adopter" ⭐⭐

**Valeur** : moyenne. Educatif, conforme à la philosophie Dorloter.

**Comment** :
- Section `/avant-d-adopter` :
  - Guides détaillés par espèce/race (besoins, coûts, idées reçues)
  - Checklist matériel à acheter
  - Quiz auto-évaluation (suis-je prêt·e ?)
  - Témoignages d'adoptants (déjà existant à valoriser)
- Contenu éditorial, sans code complexe.

**Effort** : 1-2 semaines (surtout du contenu).

#### 8.2.5 Calculateur trajet + coût visite refuge ⭐

**Valeur** : faible mais aide à la décision quand un animal est loin.

**Comment** :
- Sur une fiche animal, depuis l'adresse de l'utilisateur (déjà en DB) →
  calcul distance routière + estimation temps + coût essence/péage
  (formule simple).
- API publique gratuite : Open Source Routing Machine (OSRM) ou
  GraphHopper (open source EU).

**Effort** : 1 semaine.

### 8.3 — Public général et exposition

#### 8.3.1 Carte France interactive des acteurs ⭐⭐⭐

**Valeur** : très haute. Vitrine de la plateforme.

**Comment** :
- Page `/carte` (raccourci `/proche`) : carte MapLibre plein écran,
  toggle des layers (refuges, pensions, vétos, signalements actifs).
- Clic sur marker → mini-card avec lien fiche.
- Filtres : espèces, services, vérifié uniquement.
- URL partageable avec params (zoom, position, filtres actifs).

**Effort** : 2 semaines (la carte existe déjà pour les signalements,
généralisation).

#### 8.3.2 Stats publiques temps réel ⭐⭐

**Valeur** : moyenne. Crédibilité.

**Comment** :
- Page `/stats` ou widget home :
  - "X animaux adoptés via Dorloter ce mois"
  - "Y refuges partenaires"
  - "Z animaux retrouvés grâce à la communauté"
  - Carte de chaleur des retrouvailles
- Données vraies, refresh quotidien (cache aggressif).

**Effort** : 1 semaine.

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

#### 8.3.5 Espace presse / kit média ⭐

**Valeur** : faible mais utile pour la crédibilité.

**Comment** :
- Page `/presse` :
  - Logos Dorloter (PNG/SVG, fond clair/sombre)
  - Charte graphique courte
  - Chiffres clés à jour
  - Contact press@dorloter.fr
  - Communiqués passés
- Pas de complexité technique.

**Effort** : 2-3 jours.

### 8.4 — Perdus/trouvés (compléments sans IA)

#### 8.4.1 Mode "guetteur" / veille de zone ⭐⭐⭐

**Valeur** : haute. Mobilise la communauté sans intervention.

**Comment** :
- Sur la fiche perdu, bouton "Je vais surveiller mon quartier".
- L'utilisateur s'enregistre comme guetteur pour cette annonce, avec
  rayon (1-5 km) et durée (7-30 jours).
- Reçoit notif push à chaque update (nouveau sighting, match détecté).
- Stats sur la fiche : "N personnes guettent cet animal".

**Effort** : 2 semaines.

#### 8.4.2 Affiche imprimable multi-formats ⭐⭐

**Valeur** : haute. Extension du 4.1.

**Comment** :
- En plus du A4 (point 4.1), proposer :
  - A5 (commerçants)
  - A6 (boîtes aux lettres)
  - Stickers (5×5 cm pour lampadaires)
  - QR code seul (à coller partout)
- Toujours avec QR vers la fiche en ligne.

**Effort** : déjà inclus dans 4.1, +0.5 sem.

#### 8.4.3 Carte des retrouvailles passées ⭐⭐

**Valeur** : moyenne. Démontre que ça marche, motivation.

**Comment** :
- Page `/perdus-trouves/retrouvailles/carte` : carte avec pin sur chaque
  lieu où un animal perdu a été retrouvé (anonymisé : juste un point + date).
- Layer optionnel sur la carte principale.
- Compteur "X animaux retrouvés grâce à Dorloter".

**Effort** : 1 semaine.

#### 8.4.4 Mode rassemblement (battue communautaire) ⭐

**Valeur** : faible (cas niche) mais marquant.

**Comment** :
- L'auteur d'un signalement perdu peut organiser une "battue" :
  - Date + lieu de rendez-vous + briefing
  - Inscription des volontaires
  - Chat de coordination le jour J
- Limitation : 1 par utilisateur par signalement (anti-abus).

**Effort** : 2-3 semaines (chat + coordination).

### 8.5 — Qualité, accessibilité, conformité

#### 8.5.1 Multi-langue (i18n) ⭐⭐

**Valeur** : moyenne (frontaliers, expats), forte sur le long terme.

**Comment** :
- `next-intl` ou `next-i18next`.
- Langues prioritaires : FR (déjà), EN, ES (Belgique, Suisse, Espagne).
- Traductions UI + descriptions animaux (champ multilingue optionnel côté
  refuge).
- URLs `/en/`, `/es/`.

**Effort** : 3-4 semaines (long mais déterministe).

#### 8.5.2 Accessibilité renforcée ⭐⭐

**Valeur** : haute moralement, exigée légalement.

**Comment** :
- Audit avec axe DevTools + tests manuels lecteurs d'écran (NVDA, VoiceOver).
- Mode contraste élevé (déjà ébauché dans globals.css).
- Navigation 100% clavier.
- Sous-titres / transcriptions sur les éventuelles vidéos.
- Conformité **RGAA 4.1** (norme française).
- Page `/accessibilite` avec déclaration de conformité.

**Effort** : 2-3 semaines.

#### 8.5.3 API publique pour partenaires ⭐

**Valeur** : faible court terme, forte si on a des partenaires (médias,
sites refuges).

**Comment** :
- API REST publique `/api/public/v1/*` avec rate-limiting par clé.
- Endpoints minimaux : refuges, animaux disponibles, signalements actifs.
- Documentation OpenAPI + console interactive.
- Widget embeddable (`<iframe>` ou `<script>`) pour afficher les animaux
  d'un refuge sur son propre site.

**Effort** : 2-3 semaines.

### 8.6 — Monétisation soft (sans pub intrusive)

#### 8.6.1 Affiliations marques pet food européennes ⭐⭐

**Valeur** : moyenne. Revenu récurrent passif.

**Comment** :
- Partenariats avec marques pet food **européennes éthiques** : Yarrah
  (NL), Tomojo (FR), Frédéric (FR), Pets Deli (DE), etc.
- Liens affiliés discrets sur les guides d'adoption / hub avant d'adopter.
- Commission reversée intégralement au refuge d'origine de l'animal de
  l'utilisateur (philosophie Dorloter).
- Transparence totale : page `/partenaires` qui liste les contrats.

**Effort** : variable (surtout du commercial, peu de tech).

#### 8.6.2 Premium refuge ⭐⭐

**Valeur** : moyenne. Modèle économique soutenable.

**Comment** :
- Abonnement mensuel optionnel pour refuges (10-30 €/mois) :
  - Stats avancées (cohortes adoption, A/B test fiches)
  - Mise en avant sur la home (1 refuge featured par mois)
  - Templates email professionnels
  - Support prioritaire
  - Multi-admin sans limite (vs 3 en gratuit)
- Gratuit pour les associations sous certains seuils (loi 1901, < N
  animaux/an).

**Effort** : 1-2 semaines (after PSP en place).

#### 8.6.3 Marketplace solidaire ⭐⭐

**Valeur** : moyenne. Cohérent avec le ré-emploi.

**Comment** :
- Adoptants peuvent vendre/donner accessoires neufs/occasion (cages,
  arbres à chat, harnais...) à d'autres adoptants Dorloter.
- 5-10 % de commission → reversée au refuge d'origine de l'acheteur.
- Photos, description, prix, lieu, transport.
- Modération : auto pour refuges vérifiés, file modo pour les autres.

**Effort** : 4-6 semaines.

#### 8.6.4 Crowdfunding ciblé par animal ⭐⭐

**Valeur** : haute. Lien émotionnel direct.

**Comment** :
- Sur une fiche animal du refuge, possibilité d'ajouter une cagnotte
  ("Frais vétérinaires urgents pour Pixel : 800 €").
- Don ponctuel via PSP (point 2.5).
- Barre de progression visible.
- Mise à jour photos / témoignage refuge à mesure que la cagnotte avance.

**Effort** : 2-3 semaines (après infra dons 2.5 en place).

---

## Partie 9 · Considérations techniques transverses

### 9.1 — Extension pgvector

- Installer pgvector dans le PostgreSQL prod (Supabase la propose nativement).
- Dimension à choisir selon le modèle d'embedding (384 pour
  `multilingual-MiniLM`, 768 pour `multilingual-e5-base`, 1024 si on passe
  plus tard sur `mistral-embed`).
- Migration : ajouter colonnes `embedding vector(N)` sur `pets`,
  `reports`, `user_adoption_profile`.
- Index HNSW pour la recherche cosinus rapide.

### 9.2 — Stack IA phase 0 (gratuit, auto-hébergé)

**Inférence LLM** : **Ollama** (open-source, MIT) sur la VPS prod.

- Container Docker dédié `ollama/ollama` (sidecar du container Next.js).
- Modèle par défaut : `mistral:7b-instruct-q4_K_M` (Mistral 7B Instruct
  quantifié 4-bit) — ~4 Go RAM, ~3-5 s par requête sur une VPS 8 GB.
- Alternatives à tester : `phi3:mini` (3,8 B, plus rapide), `qwen2.5:3b`
  (multilingue solide), `llama3.2:3b`.
- Pas de fine-tuning au début, juste prompt engineering + few-shot.

**Embeddings** : **sentence-transformers** auto-hébergé.

- Modèle : `intfloat/multilingual-e5-base` (768 dims, 100+ langues, MIT)
  ou `paraphrase-multilingual-MiniLM-L12-v2` (384 dims, plus rapide).
- Exécution via :
  - **option A** : container Python sidecar léger avec FastAPI
    (recommandé pour la qualité)
  - **option B** : `@huggingface/transformers` (v3+, port JS pur via WASM,
    plus simple à déployer dans Next.js mais 5-10x plus lent)
- Embeddings calculés à la création/édition d'un pet/report (job async),
  stockés en pgvector → query sub-100ms en recherche.

**Ressources VPS** : la stack actuelle (Caddy + Next.js + Postgres) tourne
confortablement sur une **Hetzner CX22** (4 GB RAM). Pour ajouter Ollama
Mistral 7B + sentence-transformers, monter sur **CX32** (8 GB RAM, ~6 €/mois)
suffit. **Aucun coût API** tant qu'on reste sur cette stack.

### 9.3 — Module `infrastructure/ai/`

- Abstraction qui permet de basculer entre providers sans toucher les domains :
  ```ts
  // Interface stable
  ai.chat({ messages, maxTokens }): Promise<string>
  ai.embed(text: string | string[]): Promise<number[][]>
  ```
- Providers implémentés :
  - `ollama` (HTTP local `http://localhost:11434`, default)
  - `transformers-local` (embeddings JS, fallback si pas d'Ollama)
  - `mistral-api` (basculement futur)
  - `huggingface-inference` (tier gratuit cloud, fallback)
- Cache pg-based (table `ai_response_cache` keyed sur `sha256(prompt+model)`)
  avec TTL configurable.
- Rate-limiting par user (table `ai_usage_log` + check sur 24h).
- Logging structuré (prompt anonymisé, modèle, latence, tokens).

### 9.4 — Variables d'environnement

- `AI_ENABLED` (kill-switch global, default `true`)
- `AI_PROVIDER` (`ollama` | `transformers-local` | `mistral-api` |
  `huggingface-inference`, default `ollama` en prod, `transformers-local`
  en dev léger)
- `AI_CHAT_MODEL` (default `mistral:7b-instruct-q4_K_M`)
- `AI_EMBED_MODEL` (default `intfloat/multilingual-e5-base`)
- `OLLAMA_HOST` (default `http://localhost:11434`)
- `MISTRAL_API_KEY` (optionnel, pour migration future)
- `HF_INFERENCE_TOKEN` (optionnel, fallback gratuit cloud)
- `AI_CACHE_TTL_HOURS` (default `24`)
- `AI_RATE_LIMIT_PER_USER_DAY` (default `50` gratuit, `500` premium futur)

### 9.5 — Déploiement Ollama sur la VPS prod

À documenter dans `docs/DEPLOYMENT.md` :

```yaml
# docker-compose.prod.yml — ajout
ollama:
  image: ollama/ollama:latest
  volumes:
    - ollama_data:/root/.ollama
  ports:
    - "127.0.0.1:11434:11434"  # localhost uniquement
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 6G
```

Première installation : `docker exec ollama ollama pull mistral:7b-instruct-q4_K_M`.

### 9.6 — RGPD et transparence

- Quand l'IA est **auto-hébergée** (phase 0) : pas de sous-traitance externe,
  les données ne quittent pas la VPS. Mention CGU simplifiée.
- Quand l'IA passe sur **Mistral API ou Cloudflare AI** (phase 1+) : ajout
  de la sous-traitance dans le registre + clause CGU dédiée.
- Option utilisateur dans `/parametres/confidentialite` :
  "Désactiver les fonctionnalités IA" → fallback déterministe.
- Documentation `docs/AI-USAGE.md` listant les modèles utilisés, les
  données envoyées, les durées de rétention (cache 24h max).

---

## Priorisation suggérée

### Phase 1 — Quick wins sans IA (4-6 semaines)

Objectif : améliorer ce qui est déjà là sans gros effort et sans toucher
à l'infra IA. Très haut retour sur investissement.

1. **8.1.1 Templates de réponses candidatures** (1-2 sem) — gain de temps
   refuge énorme
2. **8.1.2 QR code physique par animal** (1 sem) — outil terrain
3. **4.1 + 8.4.2 PDF affiche multi-formats** (1-1.5 sem)
4. **2.6 Suivi post-adoption** (1-2 sem) — réutilise emails + témoignages
5. **2.7 Statistiques refuge avancées** (2 sem)
6. **8.2.1 Comparateur d'animaux côte à côte** (1 sem)
7. **8.3.5 Espace presse** (2-3 jours)

### Phase 1.5 — Engagement et acquisition sans IA (parallèle à phase 1, 4-6 sem)

Objectif : mobiliser la communauté et faire grandir la base utilisateurs.

1. **8.2.2 Alertes sur recherche sauvegardée** (2-3 sem) — engagement
2. **8.2.3 Pré-rendez-vous visite refuge** (2-3 sem)
3. **8.3.1 Carte France interactive des acteurs** (2 sem)
4. **8.3.2 Stats publiques temps réel** (1 sem)
5. **8.4.1 Mode "guetteur" / veille de zone** (2 sem)
6. **8.4.3 Carte des retrouvailles passées** (1 sem)

### Phase 2 — Différenciation IA gratuite, auto-hébergée (6-10 semaines)

Objectif : la couche IA souveraine qui fait la différence, **à coût zéro**
(juste la VPS qu'on a déjà, montée à 8 GB).

1. **7.1 + 7.2 + 7.5 Infrastructure IA auto-hébergée** (1-2 sem) :
   - Provisionner Ollama + sentence-transformers sur la VPS
   - Activer pgvector dans Supabase
   - Module `infrastructure/ai/` avec interface stable et 2 providers
     (`ollama`, `transformers-local`)
   - Tests de latence et qualité sur dataset Dorloter (les fiches déjà
     publiées)
2. **1.4 Matching signalements enrichi par embeddings** (2 sem · embedding
   uniquement, le LLM n'est pas critique pour cette feature → idéal pour
   valider la stack)
3. **1.3 Génération assistée des fiches** (1-2 sem)
4. **1.1 Matching adoptant ↔ animal** (3 sem)
5. **1.8 Conseils contextuels signalement** (1 sem)

**Coût mensuel à la fin de la phase 2** : ~6 €/mois de VPS supplémentaire
(passage CX22 → CX32), zéro coût d'API. Acceptable pour valider le marché.

### Phase 3 — Outils refuges sérieux (8-12 semaines)

Objectif : devenir l'outil métier de référence.

1. **2.1 Gestion médicale animal** (3-4 sem)
2. **2.2 Gestion stocks alimentaires** (2-3 sem)
3. **2.5 Gestion dons + reçus fiscaux** (4-6 sem) — débloque 8.6.4 et 3.3
4. **3.1 Carnet de santé post-adoption** (1 sem)
5. **4.2 Diffusion auto aux vétos du secteur** (2 sem)
6. **8.1.3 Étiquettes/tags personnalisés** (1 sem)
7. **8.1.5 Import CSV massif** (2-3 sem) — clé pour l'onboarding refuges

### Phase 4 — Engagement long-terme (variable)

1. **3.3 Programme parrainage** (3 sem · dépend de 2.5)
2. **8.6.4 Crowdfunding ciblé par animal** (2-3 sem · dépend de 2.5)
3. **8.1.9 Communication mass-email** (2-3 sem)
4. **8.3.3 Blog / actualités refuges** (2-3 sem)
5. **8.3.4 Calendrier d'événements** (1-2 sem)
6. **2.3 Gestion bénévoles** (4-6 sem)
7. **2.4 Familles d'accueil** (3-4 sem)
8. **5.1 Témoignages structurés** (1-2 sem)
9. **4.3 Intégration ICAD** (à investiguer commercialement d'abord)
10. **8.1.6 Tableau de bord pré-adoption** (1 sem)
11. **8.1.7 Espace documents refuge** (1-2 sem)
12. **8.1.8 Suivi transferts inter-refuges** (2 sem)

### Phase 5 — Mobile, scale, monétisation soft (variable)

1. **6.1 App mobile finalisée** (6-12 sem)
2. **6.2 Push natifs** (1 sem)
3. **8.5.1 Multi-langue i18n** (3-4 sem)
4. **8.5.2 Accessibilité RGAA 4.1** (2-3 sem)
5. **8.6.1 Affiliations marques pet food EU** (variable, surtout commercial)
6. **8.6.2 Premium refuge** (1-2 sem · après PSP)
7. **8.6.3 Marketplace solidaire** (4-6 sem)
8. **8.5.3 API publique pour partenaires** (2-3 sem)
9. **1.2 Quiz conversationnel** (luxe IA)
10. **1.5 Reconnaissance photo IA** (luxe IA)
11. **1.6 Modération auto IA** (selon volume)
12. **8.4.4 Mode rassemblement (battue)** (2-3 sem · niche)
13. **8.2.4 Hub "Avant d'adopter"** (1-2 sem)
14. **8.2.5 Calculateur trajet** (1 sem)

---

## Hors scope explicite

Ce qui **n'est pas** dans cette V2 :

- **Microservices** : on reste sur le monolithe Next.js modulaire actuel.
- **Cache Redis** : pas nécessaire avant d'avoir > 10k utilisateurs actifs.
- **Service de search externe** (Algolia, Meili) : Postgres full-text +
  pgvector suffisent.
- **Notifications SMS** : coût élevé, push + email suffisent.
- **Vidéo en direct** des refuges : trop niche.
- **Crypto / NFT** : pas dans la philosophie.
- **Intégration AWS / Google Cloud** : souveraineté UE non négociable.

---

## Métriques de succès V2

À surveiller pour valider l'impact des features livrées :

- **Adoption** : nombre d'adoptions effectives par mois, durée moyenne
  publication→adoption.
- **Perdus/trouvés** : taux de résolution, time-to-match moyen.
- **Refuges actifs** : nombre de refuges qui se connectent au moins 1x/sem.
- **NPS adoptants** : enquête trimestrielle.
- **Coût IA** : € / utilisateur actif / mois (objectif < 5 €/k actifs).
- **Performances** : p95 < 500 ms sur les pages clés (déjà tracking).

---

*Document vivant. À mettre à jour à chaque arbitrage produit majeur.*
