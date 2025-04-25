# Comptes de test · Dorloter

> Jeu de comptes pour tester les **rôles / permissions** et la **messagerie**.
> Généré le 2025-04-24. Environnement de dev local.

- **Mot de passe (tous les comptes)** : `motdepasse12`
- **Front** : http://localhost:5173 · **API** : http://localhost:8080
- Se connecter via `/login`, puis le menu compte donne accès aux espaces selon le rôle.

---

## Adoptants (rôle `user`)

| Nom | E-mail | Mot de passe | Notes |
|-----|--------|--------------|-------|
| Léa Marchand | `lea.marchand@dorloter.fr` | `motdepasse12` | a une conversation **Adoption de Rex** avec le refuge |
| Hugo Bernard | `hugo.bernard@dorloter.fr` | `motdepasse12` | a une conversation **Adoption de Filou** (1 message non lu) |
| Inès Dubois | `ines.dubois@dorloter.fr` | `motdepasse12` | adoptante « vierge » (aucune donnée) |
| Camille Adoptant | `adoptant@dorloter.fr` | `motdepasse12` | compte historique · 3 conversations (Minette / Rex / Filou) |

Accès : pages publiques + favoris, candidatures, **messagerie** (`/messages`), réservations.

---

## Équipe refuge · « Refuge des Quatre Pattes »

Tous ces comptes accèdent au même espace refuge (`/refuge`). Le **rôle par refuge** décide des permissions (pas le rôle global).

| Nom | E-mail | Mot de passe | Rôle refuge | Peut |
|-----|--------|--------------|-------------|------|
| Camille Roussel | `camille.roussel@dorloter.fr` | `motdepasse12` | **Responsable** (owner) | tout + **gérer l'équipe** |
| Thomas Girard | `thomas.girard@dorloter.fr` | `motdepasse12` | **Gestionnaire** | animaux, candidatures, messages, profil (pas l'équipe) |
| Sarah Lefèvre | `sarah.lefevre@dorloter.fr` | `motdepasse12` | **Bénévole** | lecture seule + répondre aux messages |
| Gestion Refuge | `refuge@dorloter.fr` | `motdepasse12` | **Responsable** (owner) | compte historique |

### Tester les permissions
- **Sarah (bénévole)** : voit les annonces mais ne peut pas en créer/modifier ; voit les candidatures sans les traiter ; **peut répondre** dans la messagerie. Le bouton « Ajouter un animal » et la gestion d'équipe sont refusés (403).
- **Thomas (gestionnaire)** : crée/modifie animaux, traite candidatures, répond aux messages, édite le profil. **Ne voit pas** la gestion d'équipe (page Équipe en lecture, actions 403).
- **Camille (responsable)** : tout, dont la page **Équipe** (`/refuge/equipe`) : inviter par e-mail, changer un rôle, retirer un membre. Le dernier responsable ne peut pas être retiré.

---

## Pensions (rôle `pension_admin`)

| Nom | E-mail | Mot de passe | Pension | Espace |
|-----|--------|--------------|---------|--------|
| Julien Moreau | `julien.moreau@dorloter.fr` | `motdepasse12` | Les Coussinets Dorés | `/pension/reservations` |
| Nadia Benali | `nadia.benali@dorloter.fr` | `motdepasse12` | Chatterie du Soleil | `/pension/reservations` |

Accès : réservations reçues (confirmer / refuser).

---

## Vétérinaire (rôle `veterinarian_admin`)

| Nom | E-mail | Mot de passe | Clinique |
|-----|--------|--------------|----------|
| Dr Claire Petit | `claire.petit@dorloter.fr` | `motdepasse12` | Clinique Vétérinaire Gerland |

> Note : la fiche véto est publique (annuaire). Le back-office vétérinaire dédié n'est pas encore développé ; ce compte sert à valider le rôle et la navigation.

---

## Tester la messagerie

- **Côté adoptant** : se connecter en **Léa** ou **Hugo** → `/messages` (vue plein écran liste + fil).
- **Côté refuge** : se connecter en **Camille / Thomas / Sarah / Gestion Refuge** → **Espace refuge → Messagerie** (`/refuge/messages`). Toute l'équipe voit les mêmes conversations du refuge (celles de Léa, Hugo, et du compte historique).
- Envoyer un message d'un côté, rafraîchir de l'autre (polling ~5 s) pour voir l'échange.
- Un **bénévole** peut répondre aux messages (permission `messages:write`).

---

## Matrice de permissions (refuge)

| Permission | Responsable | Gestionnaire | Bénévole |
|------------|:---:|:---:|:---:|
| Lire les animaux | ✅ | ✅ | ✅ |
| Créer / modifier un animal | ✅ | ✅ | ❌ |
| Lire les candidatures | ✅ | ✅ | ✅ |
| Traiter une candidature | ✅ | ✅ | ❌ |
| Lire / répondre aux messages | ✅ | ✅ | ✅ |
| Éditer le profil du refuge | ✅ | ✅ | ❌ |
| Gérer l'équipe (inviter / rôles) | ✅ | ❌ | ❌ |
