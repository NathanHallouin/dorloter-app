# Vision 2030 — Dorloter comme plateforme cardinale du bien-être félin en France

Document de réflexion stratégique : idées qui transformeraient Dorloter d'une plateforme d'adoption + lost/found en **l'infrastructure de référence** pour l'ensemble de l'écosystème félin français (adoptants, refuges, associations TNR, vétérinaires, pouvoirs publics).

**Philosophie** : on ne propose pas des features. On propose des **leviers systémiques** qui, cumulés, changent la donne. Chaque idée a un impact mesurable sur au moins un de ces 4 axes :

1. **Plus d'adoptions réussies** (diminuer le taux de retour, augmenter le matching qualitatif)
2. **Moins d'abandons** (encadrement post-adoption, anti-trafic, anti-hoarding)
3. **Colonies mieux gérées** (TNR industrialisé, visibilité terrain)
4. **Soin animal démocratisé** (accès véto, infos fiables, prévention)

---

## 1. Matching adoptif prédictif — au-delà des cases à cocher

### Problème
Le matching actuel repose sur des flags binaires : « OK avec chats », « OK avec enfants ». Résultat : ~30% des adoptions se terminent par un retour au refuge dans les 6 mois (chiffre SPA). La cause n°1 n'est jamais « incompatibilité espèces » — c'est le **décalage entre attentes et réalité comportementale**.

### Proposition
Questionnaire psychométrique adoptant + profil comportemental chat (tags enrichis par le refuge : niveau d'activité, sociabilité, besoin de câlins, bruyant, type de jeu, tolérance à la solitude, etc.). Score de compatibilité **multi-dimensionnel** calculé comme une distance euclidienne pondérée entre les deux vecteurs.

### Mécanique
- Questionnaire adoptant (10 min, 25 questions, UX progressive) au signup
- Enrichissement des fiches chats côté refuge (formulaire étendu, scoring assisté)
- Affichage du score de compatibilité sur chaque fiche + graphique radar
- Suggestions personnalisées "chats pour vous" sur la home

### Faisabilité & effort
- **Effort** : 4-6 semaines dev + calibration. Schema extensions, questionnaire, scoring, UI.
- **Risques** : formulaire long = abandon. Mitigation : progressif, "10 questions essentielles" + suite optionnelle.
- **Mesure impact** : A/B test taux de retour adoptions matchées vs non matchées sur 12 mois.

### Pourquoi ça change la donne
Aucun concurrent français ne fait ça. C'est le **différenciateur technique** fort après le matching perdu/trouvé. Gain probable : 10-20% de réduction du taux de retour.

---

## 2. Contrat d'adoption numérique avec check-ins obligatoires

### Problème
Le contrat papier se perd. Les refuges n'ont aucun moyen de vérifier que le chat est toujours bien à l'adresse déclarée après 3 mois. La jurisprudence oblige déjà à un suivi (art. L.214-6-3 Code rural) mais personne ne l'applique.

### Proposition
Contrat signé électroniquement au moment de l'adoption (eIDAS compliant). Check-ins obligatoires à **J+7, J+30, J+90, J+180, J+365** : mini-questionnaire (1 min) + photo récente du chat.

### Mécanique
- Signature électronique via DocuSign ou équivalent européen (Yousign FR, Universign FR — souverain)
- Push + email automatique à chaque échéance
- Escalade si pas de réponse à J+7 après rappel : notification au refuge d'origine
- Tableau de bord côté refuge : cohortes d'adoptions avec leur statut de check-in

### Faisabilité & effort
- **Effort** : 3-4 semaines. Intégration Yousign API + cron + UI refuge.
- **Risques** : légal (le contrat doit être conforme), UX (check-in doit être indolore), friction adoption (« encore de la paperasse »). Mitigation : UX native, design non-anxiogène, messaging "prenons soin ensemble".
- **Mesure impact** : % check-ins complétés, taux de rehoming détecté, temps médian de détection d'un abandon.

### Pourquoi ça change la donne
Crée un **standard** qui n'existe pas aujourd'hui. Les refuges qui l'adoptent peuvent le mettre en avant. Les adoptants sérieux adhèrent naturellement — les autres s'auto-sélectionnent out.

---

## 3. Détection anti-hoarding et anti-trafic

### Problème
Les hoarders (personnes qui accumulent des dizaines d'animaux en mauvaises conditions) et les trafiquants (revente déguisée via adoptions multiples) sont invisibles pour les refuges individuels. Un refuge refuse un adoptant suspect → il va au suivant → personne n'est prévenu.

### Proposition
Système de **flags partagés entre refuges** (avec consentement explicite de l'adoptant au signup — base légale RGPD : intérêt légitime + protection des animaux).

### Mécanique
- Chaque refuge peut lever un flag sur un user après refus documenté (motif obligatoire, 500 caractères min)
- Après 3 flags indépendants → alerte automatique à tout refuge consulté par ce user
- Après 5 flags → suspension temporaire du compte + review humaine (platform_admin)
- Détection algorithmique : adoptions multiples sur courte période, rehoming rapide, déménagements fréquents
- Integration avec I-CAD pour croiser : un user a-t-il déjà été propriétaire de chats non retrouvés ?

### Faisabilité & effort
- **Effort** : 3 semaines. Schema flags + UI + algo détection + admin review.
- **Risques** : juridique (diffamation si flag injustifié — mitigation : motif obligatoire + droit de réponse), RGPD (DPA à faire). Partenariat I-CAD complexe.
- **Mesure impact** : nombre d'alertes, % confirmées après review, nombre d'hoarders/trafiquants identifiés.

### Pourquoi ça change la donne
Zéro plateforme ne fait ça en France. Potentiel médiatique énorme (« Dorloter démasque un hoarder avec 47 chats »). Crée un effet de **confiance réciproque** entre refuges qui génère de l'adhésion au réseau.

---

## 4. Module TNR intégré — outil terrain pour associations

### Contexte
La France compte ~11M de chats errants (source ECAIE). Le TNR (Trap-Neuter-Return) est la méthode validée scientifiquement pour stabiliser les colonies. Mais les associations qui le pratiquent gèrent tout sur papier / Excel / groupes WhatsApp. Perte d'info massive, duplication de travail, rapports préfectoraux laborieux.

### Proposition
Module **TNR** dédié aux associations partenaires, séparé de l'espace refuge classique (structure juridique et finalité différentes).

### Fonctionnalités clés
- **Carte des colonies** : chaque colonie est un point géolocalisé, polygonable (zone d'influence)
- **Fiche colonie** : effectif estimé, taux de stérilisation, chats identifiés (photo + ear-tip confirmé oui/non), nourrisseurs assignés
- **Planning intervention** : calendrier de captures, vet de référence par colonie, statut « en cours / fait / à refaire »
- **Journal de terrain mobile** : les bénévoles rapportent observations (nouveaux chats, mortalité, malades) depuis le terrain avec support offline + sync ultérieur
- **Rapport annuel automatique** : export PDF conforme aux exigences préfectorales (art. L.211-27 Code rural)
- **Budget & dons** : tracking des frais de stérilisation par colonie, affichage public "adopter une colonie" pour donateurs

### Faisabilité & effort
- **Effort** : 6-10 semaines. Nouveau domaine fonctionnel entier. Schema, PostGIS avancé, mobile-first, offline-first.
- **Risques** : niche (petit nombre d'associations), besoins techniques hétérogènes selon département. Mitigation : co-design avec 3-5 associations pilotes.
- **Mesure impact** : nombre d'associations actives, colonies cartographiées, stérilisations effectuées via le module / an.

### Pourquoi ça change la donne
**Il n'existe rien en France sur ce créneau.** Les associations TNR bataillent avec des outils génériques (Airtable, Trello, Google Sheets). Devenir l'**outil standard du TNR français** = légitimité politique + données agrégées inédites qui peuvent influencer la politique publique (subventions aux associations, obligations vétérinaires, etc.).

---

## 5. Réseau vétérinaire partenaire

### Problème
Les adoptants nouveaux propriétaires ne savent pas quel vétérinaire choisir. Les refuges et associations ont chacun leur réseau de praticiens mais sans visibilité pour les adoptants. Les tarifs véto sont opaques et souvent barrière à l'adoption pour les foyers modestes.

### Proposition
Annuaire vétérinaire avec **tarifs pré-négociés** pour les adoptants Dorloter sur les soins de base (consultation, vaccins, stérilisation, identification).

### Mécanique
- Vétérinaires partenaires créent un profil sur Dorloter (type "shelter" mais catégorie `vet`)
- Grille tarifaire publique pour les adoptants (−10-20% vs tarif affiché, négociable en B2B avec les ordres vétérinaires régionaux)
- Prise de RDV intégrée (calendrier simple, pas besoin d'un full Doctolib)
- Historique médical centralisé (partageable avec le vet en un clic, côté adoptant)
- Teleconsultation asynchrone pour urgences mineures (adoptant upload photo + décrit, vet répond sous 24h)

### Faisabilité & effort
- **Effort** : 4-6 semaines pour le MVP (annuaire + profils). 8-12 pour teleconsult.
- **Risques** : régulation vétérinaire stricte en France (Ordre des vétérinaires, règles déontologiques sur tarifs). Mitigation : partenariat formel avec l'Ordre régional.
- **Mesure impact** : nombre de vets inscrits, consultations déclenchées via Dorloter, satisfaction adoptants.

### Pourquoi ça change la donne
Lève une barrière énorme à l'adoption (« je n'ai pas les moyens »). Crée un **effet vertueux** : les vets partenaires signalent des chats errants vus en cabinet → nourrissent la base Dorloter.

---

## 6. Open data et influence politique

### Contexte
L'État français n'a pas de statistiques consolidées sur l'adoption féline, la population errante, ou l'effectivité des politiques TNR. La DGAL, les préfectures et les collectivités travaillent sur des données partielles, parfois via sondages coûteux.

### Proposition
**Dorloter Open Data** : API publique + jeux de données téléchargeables sur les indicateurs agrégés (anonymisés bien sûr). Hébergé sur [data.gouv.fr](https://data.gouv.fr) en dataset public.

### Jeux de données proposés
- Adoptions par département / mois / type
- Signalements perdus/trouvés + taux de retrouvailles
- Population TNR par département, progression du taux de stérilisation
- Durée moyenne en refuge avant adoption
- Taux de retour post-adoption
- Cartographie des déserts vétérinaires (département avec peu de vets partenaires)

### Mécanique
- Export hebdomadaire automatique via cron
- Endpoint API public read-only avec rate limit
- Licence Etalab 2.0 (open data fr)

### Faisabilité & effort
- **Effort** : 2-3 semaines pour l'export + API. Plus long pour négocier l'inscription data.gouv.
- **Risques** : RGPD (anonymisation solide), compétition (quelqu'un qui copie les données pour autre chose). Mitigation : k-anonymity, aggregation minimale 5.
- **Mesure impact** : nombre de téléchargements, citations média, demandes institutionnelles.

### Pourquoi ça change la donne
Transforme Dorloter d'outil → **infrastructure de politique publique**. Un député, un journaliste, un chercheur qui veut écrire sur le sujet a **besoin** des données Dorloter. Crée une dépendance douce et positive : Dorloter devient politiquement intouchable.

---

## 7. Contrôle qualité AI sur les fiches chats

### Problème
Les fiches chats en refuge ont des descriptions de qualité très variable. Certaines sont bâclées, d'autres manquent d'infos critiques (antécédents médicaux, tolérance solitude, etc.). Résultat : matching raté, adoptants déçus.

### Proposition
**Assistant IA** côté refuge qui :
1. Analyse la fiche en cours de rédaction
2. Suggère des améliorations (« Ton annonce ne mentionne pas la tolérance à la solitude, information importante pour les foyers actifs »)
3. Détecte les incohérences (« Le chat est listé comme OK chats mais la description mentionne des bagarres »)
4. Auto-suggère des tags comportementaux à partir de la description libre

### Mécanique
- Modèle IA local (Llama 3.1 7B sur GPU partagé ou via Mistral API FR — souverain)
- Inférence à la sauvegarde de la fiche (latence acceptable 2-5s)
- Feedback non-bloquant : suggestions affichées, refuge libre de les appliquer
- Apprentissage continu sur les adoptions réussies vs retours

### Faisabilité & effort
- **Effort** : 4-6 semaines. API Mistral + prompt engineering + UI feedback.
- **Risques** : coût LLM (Mistral API ~0,002 € / requête, tenable). Erreurs IA (mitigation : suggestions jamais imposées).
- **Mesure impact** : qualité moyenne des fiches (score manuel sur échantillon), impact sur taux de contact adoptant.

### Pourquoi ça change la donne
Démocratise la **qualité** rédactionnelle. Un petit refuge bénévole a accès au même niveau de professionnalisme qu'un grand refuge avec chargé de com.

---

## 8. Système de parrainage / sponsoring

### Problème
Certains chats sont impossibles à adopter (seniors, FIV+, comportement particulier). Ils restent en refuge à vie. Le financement de leur séjour pèse sur les refuges. Pas de mécanisme pour que le grand public contribue individuellement.

### Proposition
**Parrainer un chat** : un user peut « sponsoriser » un chat non-adoptable pour 5-20€/mois. En retour : photos exclusives, vidéos trimestrielles, update sur l'évolution du chat, certificat de sponsoring, badge sur son profil.

### Mécanique
- Intégration Stripe pour les prélèvements mensuels
- 100% reversé au refuge, 0% commission Dorloter (cohérent avec la gratuité de la plateforme)
- Page publique « chats à parrainer » avec criteria (âge, maladie, etc.)
- Le refuge peut envoyer un post trimestriel à tous les parrains d'un chat
- Possibilité de parrainer collectivement (plusieurs parrains sur un même chat)

### Faisabilité & effort
- **Effort** : 3-4 semaines. Stripe subs + pages + posts du refuge.
- **Risques** : Stripe réserve (commission). Fiscalité (le refuge doit être reconnu d'intérêt général pour que le parrain bénéficie d'une déduction fiscale).
- **Mesure impact** : nombre de chats parrainés, montant collecté annuel, % de chats non-adoptables effectivement sponsorisés.

### Pourquoi ça change la donne
Crée une **source de revenus nouvelle** et stable pour les refuges. Rend visible des chats invisibles. Donne à l'utilisateur moyen une façon de contribuer sans adopter.

---

## 9. Dépôt de garantie "proof-of-care"

### Problème
Les abandons en période estivale explosent (taux × 3 en juillet-août). Beaucoup d'adoptants n'anticipent pas le coût/la responsabilité réelle et craquent au premier obstacle.

### Proposition
Au moment de l'adoption, l'adoptant place un **dépôt de 200-500€** (selon le refuge), **remboursé progressivement à chaque check-in réussi** (voir §2) : 25% à J+30, 25% à J+90, 50% à J+180.

### Mécanique
- Pas un frais d'adoption caché : clairement présenté comme "garantie restituable"
- Placé sur un compte séquestre (via Stripe Escrow ou partenaire bancaire)
- Si abandon avant J+180 → le refuge conserve le dépôt pour couvrir les frais de reprise
- Si adoptant dans le besoin financier → possibilité de saisir la saisine pour libération partielle (étude au cas par cas)

### Faisabilité & effort
- **Effort** : 4-6 semaines. Escrow + workflow + communication.
- **Risques** : légal (droit du consommateur), barrière financière (réduit le pool d'adoptants). Mitigation : exonération pour RSA/AAH/étudiants.
- **Mesure impact** : taux d'abandon avant J+180 vs sans dépôt (A/B test sur refuges volontaires).

### Pourquoi ça change la donne
Transforme la **décision d'adoption en décision réfléchie**. Les adoptants impulsifs s'auto-excluent. C'est controversé — certains y verront de l'élitisme — mais c'est scientifiquement étayé (le « skin in the game » réduit l'abandon de 40% selon les études US avec adoption fees).

---

## 10. Rehoming encadré vs LeBonCoin sauvage

### Problème
Quand un adoptant doit rendre son chat, beaucoup vont sur LeBonCoin / Facebook. Cela court-circuite complètement le refuge d'origine (qui a pourtant un droit de reprise contractuel). Le chat finit chez n'importe qui, parfois dans des conditions pires.

### Proposition
**Flow rehoming intégré** : l'adoptant qui ne peut plus garder son chat le signale sur Dorloter. 3 scénarios :
1. **Retour au refuge d'origine** (si disponible + adopté via Dorloter)
2. **Rehoming assisté** : le profil du chat est republié sur Dorloter, marqué « rehoming » (distinct d'adoption initiale), visible uniquement aux adoptants qualifiés (ayant passé le questionnaire §1)
3. **Network match** : d'autres refuges partenaires sont alertés s'ils peuvent reprendre

Dans tous les cas, Dorloter **interdit la transaction privée** via ses CGU et **trace le transfert de responsabilité** dans l'I-CAD.

### Faisabilité & effort
- **Effort** : 3-4 semaines. Workflow + UI + notifs.
- **Risques** : les gens font quand même du LeBonCoin (on ne peut pas forcer). Mitigation : rendre Dorloter plus attractif (rapidité, accompagnement).
- **Mesure impact** : nombre de rehomings via Dorloter vs LeBonCoin (sondages), % de reprises par refuge d'origine.

### Pourquoi ça change la donne
Ferme le « trou noir » du rehoming non-encadré. Augmente drastiquement la traçabilité des animaux sur leur vie entière.

---

## 11. Intégration nationale avec I-CAD

### Contexte
I-CAD (Identification des Carnivores Domestiques) est la base nationale obligatoire. Tout chat identifié (puce) y est enregistré. C'est **la** source de vérité légale en France.

### Proposition
Partenariat officiel avec I-CAD pour :
- **Lookup en temps réel** : un chat signalé perdu → check automatique I-CAD → contact direct du propriétaire
- **Enregistrement du changement de propriétaire** lors d'une adoption Dorloter (aujourd'hui souvent oublié ou fait manuellement)
- **Détection de propriétaires multiples** dans la chaîne d'adoption (anti-hoarding, §3)
- **Validation des identifications refuge** (un chat vendu comme "identifié au refuge X" est-il bien enregistré ?)

### Faisabilité & effort
- **Effort** : 3-6 mois de négociation + 4-6 semaines dev. Partenariat institutionnel.
- **Risques** : I-CAD est un monopole avec inertie. Négociation longue. Mitigation : approche via la DGAL (qui a intérêt à voir I-CAD moderniser son API).
- **Mesure impact** : % de signalements résolus via I-CAD lookup, nombre de transferts de propriété enregistrés.

### Pourquoi ça change la donne
Transforme Dorloter en **interface utilisateur moderne** sur une infrastructure d'État sous-utilisée. I-CAD gagne un canal public, Dorloter gagne la légitimité de l'intégration officielle. Gagnant-gagnant.

---

## 12. Observatoire de la maltraitance

### Problème
Les signalements de maltraitance vont soit à la DDPP (lente, sous-dotée), soit à la SPA (qui fait ce qu'elle peut). Pas de vue consolidée. Pas de follow-up transparent pour le signaleur.

### Proposition
Onglet « Signaler une maltraitance » distinct du signalement perdu/trouvé. L'utilisateur décrit, photographie, géolocalise. Dorloter :
1. Route automatiquement vers la DDPP compétente (via son annuaire officiel)
2. Notifie les associations de protection animale locales actives sur la zone
3. Trace le suivi (statut : reçu / en cours / clôturé)
4. Agrège anonymement dans un tableau de bord public (pour pression médiatique sur les zones sous-dotées)

### Faisabilité & effort
- **Effort** : 4-6 semaines.
- **Risques** : juridique (diffamation), frictions avec DDPP qui n'aiment pas être mises en transparence. Mitigation : statuts anonymes, travail en amont avec DGAL.
- **Mesure impact** : nombre de signalements, % ayant donné lieu à une action, visibilité médiatique.

### Pourquoi ça change la donne
Rend **visible** ce qui aujourd'hui est noyé. Crée de la pression institutionnelle documentée. Certains politiques vont faire de la comm' sur ces données — tant mieux.

---

## 13. Registre des bonnes pratiques — certification refuges

### Problème
Il existe des refuges excellents et des refuges discutables. Rien ne permet à l'adoptant de distinguer les deux au-delà du badge « vérifié » actuel (qui vérifie juste l'existence juridique).

### Proposition
**Certification Dorloter Gold** : label délivré aux refuges qui remplissent un cahier des charges contraignant :
- Tous les chats FIV/FeLV testés et renseignés
- Taux de check-in post-adoption > 70%
- Taux de retour < 10%
- Audit physique annuel par un vétérinaire indépendant (rémunéré par Dorloter ou par pool mutualisé)
- Formation des admins refuges (e-learning Dorloter de 5h, certification)
- Transparence financière (bilan publié)

### Mécanique
- Dossier de candidature, audit, renouvellement tous les 2 ans
- Financement de l'audit par pool mutualisé (quelques € par refuge membre)
- Badge Gold affiché proéminament sur la fiche + page dédiée « Refuges Gold »

### Faisabilité & effort
- **Effort** : 6-12 semaines pour le cadre + 12-24 mois pour ramper. Beaucoup de concertation.
- **Risques** : politique (refuges qui ne l'obtiennent pas se sentent lésés), coût de l'audit. Mitigation : approche progressive, co-construction.
- **Mesure impact** : nombre de refuges Gold, impact sur adoptions chez refuges Gold vs non-Gold.

### Pourquoi ça change la donne
Crée un **référentiel qualité** que le secteur n'a pas aujourd'hui. Tire tout le monde vers le haut par émulation. Plus tard, ce référentiel pourrait être adopté comme standard par les pouvoirs publics (financements publics conditionnés à Gold).

---

## 14. Communauté de pratique adoptants

### Problème
Un adoptant nouveau qui a un souci (le chat gratte les meubles, miaule la nuit, refuse la litière) google → réponses contradictoires → parfois il abandonne parce qu'il pense que « ça ne va pas ». Alors que 80% de ces soucis sont résolubles en 2 semaines avec les bons conseils.

### Proposition
**Forum intégré** + **experts bénévoles** (comportementalistes, éducateurs félins, adoptants expérimentés) qui répondent aux questions sous 48h.

### Mécanique
- Section « Questions et conseils » accessible aux adoptants Dorloter
- Posts modérés (pas de 4chan), badges experts vérifiés
- Contenu long-form indexable SEO (les questions communes = pages atterrissage pour adoptants hors-plateforme)
- Compilations par thème (arrivée, litière, griffades, solitude…)

### Faisabilité & effort
- **Effort** : 4-6 semaines pour forum basique. Plus long pour modération + recrutement experts.
- **Risques** : modération (ressource humaine). Spam.
- **Mesure impact** : nombre de questions postées, % résolues, réduction taux de retour.

### Pourquoi ça change la donne
Comble le trou entre « j'ai adopté » et « je sais gérer ». Augmente la rétention. SEO bonus : « chat qui miaule la nuit » → article Dorloter en top Google.

---

## 15. Application mobile terrain (refuges + TNR)

### Problème
Les bénévoles en action (tractage TNR, visite à domicile, sauvetage) ont besoin d'outils terrain — appareil photo géolocalisé, accès offline, check-list. Aujourd'hui ils utilisent des apps multiples non intégrées.

### Proposition
**App mobile dédiée** (PWA → iOS/Android via Capacitor) avec :
- Mode **Terrain** : photo + géoloc + notes synchrones quand connecté, sinon queue locale
- **Check-lists** de visite (pre-adoption, post-adoption)
- **Scanner de puce** (via lecteur BLE interopérable — il existe déjà sur le marché)
- **Mode hors ligne complet** : carte, fiches chats, contacts vet
- **Notifications terrain** : alerte quand un bénévole arrive près d'une colonie à surveiller

### Faisabilité & effort
- **Effort** : 8-12 semaines pour une app solide. PWA déjà en place, il faut étendre.
- **Risques** : complexité de l'offline-first. App stores (iOS payant, android review).
- **Mesure impact** : nombre de bénévoles actifs, usage par session, taux d'adoption dans les refuges.

### Pourquoi ça change la donne
Met en commun les outils des acteurs terrain. Uniformise les données (toutes les équipes utilisent les mêmes check-lists). Permet à Dorloter de devenir **l'OS métier** pour les équipes refuge et TNR.

---

## Priorisation suggérée

Voici une matrice impact × effort, vue à 24 mois :

| Idée | Impact sur la mission | Effort dev | Verrou externe | Priorité |
|---|---|---|---|---|
| 1. Matching prédictif | Très fort | Moyen | Aucun | **P0** |
| 3. Anti-hoarding | Fort | Moyen | Un peu | **P1** |
| 4. Module TNR | Très fort (niche) | Fort | Co-design asso | **P0** |
| 2. Check-ins contractuels | Fort | Moyen | Légal (Yousign) | **P1** |
| 5. Réseau vet | Fort | Fort | Ordre vétérinaire | **P2** |
| 14. Forum adoptants | Moyen | Faible | Modération | **P1** |
| 7. IA contrôle qualité | Moyen | Moyen | Coût LLM | **P2** |
| 8. Parrainage | Moyen | Faible | Stripe setup | **P1** |
| 10. Rehoming encadré | Fort | Moyen | Adoption user | **P1** |
| 11. I-CAD | Très fort | Faible dev, fort négoce | Institutionnel | **P2** |
| 6. Open data | Moyen direct, fort politique | Faible | Neutre | **P1** |
| 13. Certification Gold | Fort | Moyen | Politique/audit | **P2** |
| 15. App mobile terrain | Moyen-fort | Fort | Effort | **P2** |
| 9. Dépôt de garantie | Moyen-fort | Moyen | Controverse | **P3** |
| 12. Observatoire maltraitance | Moyen | Moyen | Institutionnel | **P3** |

**Les 4 à lancer en priorité absolue** si je devais parier :
1. **Matching prédictif** (§1) — le différenciateur technique
2. **Module TNR** (§4) — le monopole fonctionnel
3. **Rehoming encadré** (§10) — ferme le trou noir
4. **Check-ins contractuels** (§2) — crée le standard

Ces 4 combinés font de Dorloter **l'outil évident** pour l'écosystème. Le reste se construit par capillarité.

---

## Modèle économique soutenable (pour financer tout ça)

Dorloter doit rester **gratuit pour adoptants, refuges et associations** (c'est la promesse). Alors d'où vient l'argent ?

1. **Parrainage** (§8) : 1-3% de revenu via frais Stripe
2. **Réseau vet** (§5) : % sur les consultations prises via Dorloter (les vets acceptent)
3. **Subventions publiques** : CNAF, conseils régionaux, DGAL — viennent après §6 (open data) et §11 (I-CAD)
4. **Mécénat entreprises** : fondations animales (Royal Canin, Purina), assurances animaux (SantéVet, Assur O'Poil) qui veulent associer leur marque
5. **Dons volontaires** : page « soutenir Dorloter » discrète

**Cible 2030** : autosuffisance à 100 000 € / an de revenus récurrents pour couvrir 2 salaires temps plein + infra.

---

## L'étape d'après

Ce doc ne propose pas de roadmap temporelle précise — c'est une **vision**. Chaque idée vaut une réflexion approfondie individuelle (mini-doc dédié, comme `GAMIFICATION.md` ou `MESSAGING.md`), un sondage auprès de l'audience cible, et éventuellement un prototype.

**Proposition concrète** : choisir **1 idée P0** pour le prochain cycle de 6 mois, aller en profondeur, et mesurer. Si ça marche → on enchaîne. Si ça ne marche pas → on apprend. Pas de fuite en avant sur 15 features à la fois.

Si tu devais me demander mon choix à brûle-pourpoint : **Module TNR (§4)**. Raison : c'est la brique sur laquelle il y a **zéro concurrence**, forte demande latente, et ça positionne Dorloter auprès des institutions (DGAL, préfectures). Après 6 mois de TNR solide, tu as un argument politique qui débloque I-CAD (§11) et un dataset qui intéresse chercheurs + journalistes (§6). Effet boule de neige.

Le matching prédictif (§1) est plus sexy côté produit, mais ça reste dans la compétition B2C avec SPA, PetAlert et d'autres. Le TNR est un **océan bleu**.
