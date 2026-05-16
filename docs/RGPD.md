# Conformité RGPD

État de la conformité de Dorloter au règlement européen sur la protection des données, et ce qui reste à la charge de l'éditeur.

> La politique publiée sur le site (`apps/web` · `PrivacyPage.tsx`) est la **traduction littérale de ce que fait le code**. Les deux doivent évoluer ensemble : toute modification du modèle de données, des durées de purge ou des sous-traitants doit être répercutée dans les deux sens.

## Ce qui est implémenté

### Pas de fuite vers des tiers

Les polices de caractères sont **auto-hébergées** (`packages/ui/src/fonts.css`, paquets `@fontsource-variable/*`). Elles étaient auparavant chargées depuis `fonts.googleapis.com`, ce qui transmettait l'adresse IP de chaque visiteur à Google avant tout consentement · montage sanctionné par le tribunal régional de Munich en janvier 2022, et contraire à la règle de souveraineté du projet. Vérification après build :

```bash
cd apps/web && bun run build && grep -r 'fonts.googleapis.com\|fonts.gstatic.com' dist/   # doit être vide
```

Aucun outil de mesure d'audience, aucun tracker, aucun cookie non essentiel. Le stockage local ne sert qu'à la session et au thème, tous deux strictement nécessaires : **pas de bandeau de consentement requis**. Cette exemption tombe dès l'ajout d'un outil d'analytics · privilégier alors Matomo ou Plausible auto-hébergés en mode sans cookie.

### Documents légaux

| Page | Route | Base légale |
|---|---|---|
| Mentions légales | `/mentions-legales` | LCEN art. 6 III |
| Politique de confidentialité | `/confidentialite` | RGPD art. 13 |
| CGU | `/cgu` | contractuel |

Les trois sont liées depuis le pied de page. Les informations que seul l'éditeur peut fournir sont marquées par le composant `ToFill`, visuellement voyant pour empêcher une mise en ligne avec des trous :

```bash
grep -rn "ToFill" apps/web/src/pages          # liste ce qu'il reste à remplir
```

### Droits des personnes

| Droit | Article | Mise en œuvre |
|---|---|---|
| Accès et portabilité | 15, 20 | `GET /api/v1/me/export` · bouton « Télécharger mes données » du profil, export JSON complet |
| Rectification | 16 | `PATCH /api/v1/me` · formulaire du profil |
| Effacement | 17 | `DELETE /api/v1/me` · bouton « Supprimer mon compte », avec confirmation explicite |
| Retrait du consentement | 7 | bascule du digest de proximité dans le profil |

L'effacement suit **deux chemins**, dans `identity/privacy.service.ts` :

- **Suppression pure** quand rien ne s'y oppose. Les clés étrangères sont en `ON DELETE CASCADE` : la ligne `users` emporte signalements, candidatures, favoris, conversations, notifications, réservations et appartenances.
- **Anonymisation** quand l'utilisateur porte un contrat d'adoption ou un suivi post-adoption (`contracts` et `adoption_followups` sont en `ON DELETE RESTRICT`, ces pièces devant être conservées comme justificatifs). Tout le reste est effacé explicitement et la fiche est vidée de toute donnée identifiante : email neutralisé sur le domaine non routable `dorloter.invalid`, nom remplacé, téléphone, ville, bio, avatar et géolocalisation effacés.

Dans les deux cas les identifiants de connexion (`accounts`, `auth_refresh_tokens`) partent immédiatement. La réponse indique lequel des deux chemins a été emprunté.

### Limitation de la conservation (art. 5.1.e)

`identity/retention.service.ts` applique les durées annoncées dans la politique. Il tourne au démarrage puis toutes les 24 h, sans dépendance d'ordonnancement ajoutée.

| Donnée | Durée | Action |
|---|---|---|
| Signalement actif sans activité | 12 mois | passe en `expire` |
| Signalement résolu ou expiré | 12 mois de plus | supprimé |
| Candidature close | 3 ans | supprimée |
| Conversation sans échange | 3 ans | supprimée (messages en cascade) |
| Notification | 12 mois | supprimée |
| Jeton de rafraîchissement expiré ou révoqué | immédiat | supprimé |
| Signalement de modération traité (masqué, rejeté) | 12 mois | supprimé |
| Fiche bénévole passée en `inactive` | 3 ans | supprimée |
| Compte inactif | 3 ans | relance par email, puis suppression 30 jours plus tard |
| Journaux d'accès Caddy (adresses IP) | 12 mois | `roll_keep_for 8760h` dans le `Caddyfile` |

Deux cas méritent une explication. Les **signalements de modération** conservent qui a signalé quel contenu : une fois le dossier clos, rien ne justifie de garder ce lien. Les **fiches bénévoles** sont saisies par les refuges et ne correspondent pas nécessairement à un compte : nom, email et téléphone y resteraient indéfiniment, aucun autre mécanisme ne venant les effacer. Le seuil de 3 ans sur le seul statut `inactive` est délibérément prudent, une mise en sommeil temporaire n'étant pas emportée.

### Comptes inactifs

Le cas le plus délicat, puisqu'il supprime des comptes que personne n'a demandé à supprimer. Il se déroule en deux temps, avec trois garde-fous.

L'activité réelle est suivie par `users.last_seen_at`, rafraîchie aux connexions et aux renouvellements de jeton, au plus une écriture par jour et par compte. `updated_at` ne pouvait pas servir : elle bouge à chaque édition de profil et n'exprime donc pas l'usage.

Passé **3 ans** sans activité, un email annonce la suppression et indique qu'une simple reconnexion suffit à l'éviter. La date part dans `inactivity_notified_at`. **30 jours** plus tard, si le compte n'a toujours pas servi, il est effacé par le même chemin que la suppression volontaire (donc anonymisé plutôt que supprimé s'il porte un contrat).

Les garde-fous :

1. **Aucune suppression sans relance effectivement remise.** `EmailService.send` renvoie un statut de remise, et `inactivity_notified_at` n'est posée que s'il est positif. Sans transport SMTP configuré, la phase 1 ne marque rien, donc la phase 2 ne trouve rien : le comportement par défaut est de ne rien supprimer, et un avertissement est loggué à chaque passe.
2. **Toute reconnexion annule la procédure.** `inactivity_notified_at` repasse à NULL en même temps que `last_seen_at` est rafraîchie.
3. **Les comptes rattachés à une structure sont hors périmètre.** Rôles professionnels, `shelter_id`, `pension_id` et membres d'équipe sont exclus : supprimer le compte d'un responsable de refuge peu connecté couperait l'accès de toute son équipe. Leur sort relève d'une décision humaine.

Les relances sont plafonnées à 200 par passe, pour qu'un premier balayage sur une base ancienne ne parte pas en salve d'emails. Le reliquat est traité à la passe suivante et le plafonnement est loggué.

Déclenchement manuel, réservé à `platform_admin` :

```bash
curl -X POST https://dorloter.fr/api/v1/admin/retention/run -H "Authorization: Bearer <token admin>"
```

Ce service est le seul endroit du code qui écrit dans les tables d'autres modules. C'est délibéré : l'expiration est une propriété de la donnée, pas du domaine qui la produit, et un point de vérité unique vaut mieux que neuf purges dispersées.

### Minimisation

Les coordonnées de contact d'un signalement ne sont **jamais** exposées dans les listes ni sur la carte : elles passent par l'endpoint dédié `GET /reports/:id/reveal-contact`, réservé aux personnes connectées et au cas par cas.

## Registre des traitements

Le registre exigé par l'article 30 est tenu dans **[RGPD-REGISTRE.md](./RGPD-REGISTRE.md)**. Il recense onze traitements, pré-remplis depuis le modèle de données, et documente aussi les traitements volontairement écartés (mesure d'audience, profilage, décision automatisée) · leur absence est un choix qu'il vaut mieux tracer.

## Procédure de violation de données

Une violation est tout incident qui compromet la confidentialité, l'intégrité ou la disponibilité de données personnelles : fuite de la base, secret compromis, accès non autorisé à l'espace pro, suppression accidentelle sans sauvegarde exploitable. **Le délai de 72 h court à partir du moment où l'on a connaissance de l'incident**, pas de sa résolution.

**1. Contenir, sans détruire les traces.** Isoler ce qui peut l'être et faire une copie des journaux avant toute remise en état, sinon l'analyse d'impact devient impossible. En cas de secret compromis, la rotation est prioritaire :

```bash
# Rotation d'un secret fuité (JWT, mots de passe PG, clés S3)
cd /opt/dorloter && nano .env.production
docker compose -f docker-compose.prod.yml up -d --force-recreate
# La rotation de API_JWT_SECRET invalide tous les access tokens en cours.
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U dorloter -d dorloter -c "DELETE FROM dorloter_api.auth_refresh_tokens;"
```

**2. Qualifier.** Quelles catégories de données, combien de personnes, quelles conséquences possibles. Les traitements les plus sensibles ici sont la **géolocalisation des signalements** (T2) et les **candidatures**, qui décrivent le foyer et mentionnent les enfants (T3).

**3. Consigner.** Tout incident se consigne, **y compris ceux qui ne sont pas notifiés** : c'est une obligation de l'article 33.5 et la seule preuve que l'arbitrage a été fait. Consigner la date et l'heure de découverte, la nature, les catégories et volumes concernés, les mesures prises, et la justification de la décision de notifier ou non.

**4. Notifier la CNIL sous 72 h**, sauf si la violation est peu susceptible d'engendrer un risque pour les personnes. En cas de doute, notifier : une notification de trop ne coûte rien, une notification manquante est une infraction. Le formulaire est en ligne sur cnil.fr.

**5. Informer les personnes** (art. 34) si le risque est élevé : fuite de coordonnées, de localisation ou de contenus de messagerie. Message factuel, en français clair : ce qui s'est passé, quelles données, ce qu'elles risquent, ce que nous faisons, ce qu'elles peuvent faire.

**6. Corriger la cause.** Un incident clos sans correctif se reproduit.

## Contrats de sous-traitance (art. 28)

Chaque sous-traitant doit être couvert par un contrat ou des clauses de protection des données. Les trois sont fournis en standard, il s'agit de les récupérer et de les archiver :

| Sous-traitant | Où récupérer le contrat |
|---|---|
| OVH | Espace client · Contrats et conditions · avenant relatif à la protection des données |
| Brevo | Compte · paramètres de confidentialité · accord de traitement des données |
| Fournisseur de tuiles cartographiques | Dépend du fournisseur retenu. À trancher avec le choix de `VITE_MAP_STYLE` : MapTiler (Suisse) et Protomaps auto-hébergé sont les options les plus simples à documenter. |

## Ce qui reste à faire

Ne peut être fait que par l'éditeur, aucune de ces informations n'étant déductible du code :

1. **Compléter les mentions légales, la politique et le registre** · tout ce que marque `ToFill` dans les pages et `À COMPLÉTER` dans le registre : raison sociale, siège, RNA, SIREN, représentant légal, adresses de contact. **Bloquant pour une mise en ligne publique.**
2. **Récupérer et archiver les trois DPA** · voir le tableau ci-dessus. Aucune démarche contractuelle à négocier, seulement à collecter.
3. **Relire le registre** · les finalités et durées y sont pré-remplies depuis le modèle de données, mais l'éditeur reste responsable de leur exactitude au regard de ses pratiques réelles.

Les photos sont désormais effacées **du stockage** en même temps que leur ligne : à la purge de rétention, à la suppression d'un compte, et quand un refuge retire une photo de la galerie. Les URL étant relevées avant la suppression des lignes (sans quoi plus rien ne permettrait de retrouver les objets), un fichier ne survit plus à la donnée qui le référençait. L'opération est best-effort et journalisée : un objet resté orphelin n'interrompt jamais une purge.

Et une dépendance opérationnelle : **la suppression des comptes inactifs ne s'active qu'une fois le SMTP configuré** (`EMAIL_SMTP_HOST`). C'est voulu, mais cela signifie que la durée de conservation annoncée pour les comptes n'est effectivement appliquée qu'à partir de ce moment. Renseigner les identifiants Brevo dans `.env.production` suffit.

## Tests

`privacy.service.test.ts` protège la propriété qui casse silencieusement : qu'une migration ajoute une table rattachée à `users` et que le chemin d'anonymisation l'oublie, laissant survivre des données d'un compte pourtant supprimé. Aucun test fonctionnel ne détecterait ça.

Le test compare statiquement les clés étrangères NOT NULL vers `users` déclarées dans les migrations avec les tables réellement traitées par `privacy.service.ts`. Il ne touche pas la base et tourne donc en CI sans Postgres. Une nouvelle table rattachée à un utilisateur doit être soit purgée dans `deleteAccount`, soit ajoutée à `INTENTIONALLY_RETAINED` avec sa justification légale · sans quoi le test échoue en nommant la table et la migration fautive.

Ce que ce test ne couvre pas, et qui a été vérifié à la main contre PostGIS : le comportement d'exécution des deux chemins d'effacement et des huit étapes de purge. Des tests d'intégration demanderaient un service Postgres dans la CI, ce qui dépasse le cadre de la conformité.
