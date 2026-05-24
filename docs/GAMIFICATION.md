# Gamification · stratégie d'engagement

## Philosophie

Dorloter opère sur un terrain émotionnel : on perd son chat, on adopte, on sauve. La gamification classique (XP, levels, streaks, collections) **cheapifie la mission** et fait fuir les utilisateurs sérieux · concierges, bénévoles, refuges. L'objectif n'est pas de créer une dopamine loop, c'est de **reconnaître publiquement les contributions réelles** pour alimenter la fierté, la réputation et l'auto-modération communautaire.

Règle directrice : **on récompense les résultats, pas l'activité**. Poster 50 signalements douteux ne doit rien rapporter. Aider à retrouver 3 chats, oui.

## Ce qu'on fait

### 🏅 Retrouvailles confirmées (user)

Compteur public sur le profil utilisateur, incrémenté à chaque signalement **résolu** (status `resolu`) où le propriétaire ou le découvreur confirme explicitement que le chat a été retrouvé. Affiché sous l'avatar : "🏅 3 chats rendus à leur famille".

**Pourquoi ça marche** : c'est factuel, vérifiable, et porte la fierté sur le bon résultat (reunion), pas sur le volume d'annonces.

### 🎖 Badges paliers (user)

Débloqués automatiquement à partir de seuils :

| Palier | Badge | Condition |
|---|---|---|
| 1 retrouvaille | **Bonne âme** | 1 signalement résolu dont vous étiez l'auteur ou un confirmateur |
| 3 retrouvailles | **Héros du quartier** | 3 signalements résolus cumulés |
| 10 retrouvailles | **Sentinelle** | 10 signalements résolus · titre rare, visible en commentaire/profil |

Affichés sous forme de petites pastilles discrètes, pas en bannière agressive. Un clic ouvre une explication de l'obtention.

### 🔎 Validation de correspondance (user)

Quand le matching algo propose une suggestion (perdu × trouvé), l'utilisateur peut **confirmer** ou **rejeter**. Chaque confirmation menant à une retrouvaille réelle nourrit le compteur.

**Bénéfice secondaire** : l'algo apprend des feedbacks → meilleur matching à long terme.

### 📈 Leaderboard refuges (pas individus)

Sur `/refuges` : un bandeau "Les plus actifs ce mois-ci" listant 3-5 refuges selon un score composite :

- Taux de réponse aux candidatures (<48h)
- Nombre d'adoptions réussies (status `adopte`) sur la période
- Fraîcheur des annonces (taux de chats avec photos à jour)

**Pas de score visible pour les refuges individuellement** en dehors du top. On évite le name-and-shame des petits refuges qui n'ont pas le temps de bien tenir leur page.

### 🤝 Badge "Famille d'accueil" (user)

Marqueur de profil pour les utilisateurs qui ont déclaré (et qu'un refuge admin a confirmé) accueillir des chats en famille d'accueil. C'est plus un flag de statut qu'une récompense · utile pour les refuges qui cherchent des FA.

## Ce qu'on ne fait PAS

Liste explicite de ce qu'on **refuse** d'implémenter, pour résister à la tentation plus tard :

- ❌ **XP / niveaux** ("Niveau 12 adoptant") · infantilisant sur une plateforme sérieuse
- ❌ **Streaks de visite** ("Vous avez visité 7 jours de suite !") · mécanique d'addiction, aucun rapport avec la mission
- ❌ **Points pour poster** un signalement ou créer une annonce · incite au spam et aux faux signalements
- ❌ **Récompenses pour partager** · incite au spam sur réseaux sociaux, pollue l'écosystème
- ❌ **Collection de chats favoris** ("Vous avez collectionné 50 chats !") · faux collection, pas d'adoption réelle
- ❌ **Leaderboards individuels des adoptants** · l'adoption n'est pas une compétition, c'est un engagement à vie
- ❌ **Badges "Premier" ou "Early adopter"** · récompense l'ancienneté, pas la contribution
- ❌ **Notifications de relance "Revenez, vous avez un badge à réclamer"** · manipulation, pas engagement sincère

## Proposition MVP (première itération)

Scope minimal pour valider que l'approche engage sans tomber dans les travers :

1. **Compteur `resolved_count`** sur la table `users` (derived ou cached)
2. **Flag `resolved_confirmed_by_user_id`** sur la table `reports` quand quelqu'un confirme la résolution
3. **Workflow de confirmation** : bouton "Ce chat a été retrouvé" sur le détail de signalement (visible par l'auteur uniquement) → passage en status `resolu` + notification à toute personne ayant confirmé une correspondance avec ce signalement, qui voit son compteur incrémenter
4. **Affichage profil** :
   - Sur `/profil` (le sien) : "🏅 3 chats rendus à leur famille" + badge palier le plus élevé
   - Sur les cartes de signalement / messages : mini-badge à côté du nom de l'auteur si palier Héros ou Sentinelle atteint
5. **Admin-users** : colonne "Retrouvailles" ajoutée à la liste, tri possible

**Effort estimé** : 1-2 jours dev (1 migration SQL, 1 service/endpoint API, 1 composant `UserBadge`, UI sur 3-4 emplacements).

## Schéma DB suggéré

```sql
-- Ajouts à users
ALTER TABLE users ADD COLUMN resolved_count INTEGER NOT NULL DEFAULT 0;

-- Nouvelle colonne sur reports pour traquer la confirmation
ALTER TABLE reports ADD COLUMN resolved_at TIMESTAMP;
ALTER TABLE reports ADD COLUMN resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Table de journal pour garder la trace des contributeurs qui touchent un compteur
-- (utile si plusieurs users ont aidé · ex. un confirmateur d'un match de quelqu'un d'autre)
CREATE TABLE resolution_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'author' | 'confirmer' | 'matcher'
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (report_id, user_id, role)
);
```

La résolution d'un signalement déclenche l'insertion de lignes dans `resolution_credits` pour chaque user concerné, puis un update de `users.resolved_count` via trigger SQL ou service applicatif (API).

## Mesurer le succès

Indicateurs à suivre en base (dashboard admin) :

- **% des signalements résolus** avec confirmation explicite (vs expirés ou abandonnés) · doit monter
- **Nombre de users avec au moins 1 retrouvaille** · trajectoire engagement
- **Taux de retour** (users qui postent >1 signalement ou confirment >1 match) · mesure de l'engagement répété
- **Temps moyen signalement → résolution confirmée** · si ça baisse, la gamification a contribué à pousser à l'action

À revoir à 3 mois post-lancement : si les badges ne sont pas réclamés / ne corrèlent pas avec de l'engagement réel, pivoter. Si ça marche, étape 2 : leaderboard refuges et badge FA.

## Évolutions possibles (phase 2+)

À ne pas lancer tant que le MVP n'a pas prouvé sa valeur :

- **Système de recommandation peer-to-peer** : les FA peuvent endosser un adoptant ("déjà adopté chez nous en 2024")
- **Badge "vérifié par un refuge"** : un refuge admin peut attester qu'un user est FA ou bénévole fiable
- **Score de confiance pour les refuges** agrégé de tous les indicateurs (vérification SIRET + adoptions réussies + temps de réponse + ancienneté) · utile si beaucoup de faux refuges essaient de s'inscrire
