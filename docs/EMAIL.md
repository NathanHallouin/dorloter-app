# Email transactionnel

> Source de vérité du stack : **[CLAUDE.md](../CLAUDE.md)**. Cette doc décrit la
> couche d'envoi d'emails de l'API (`apps/api`, `src/infra/email/`).

## État actuel · GAP

L'API prévoit quelques **emails transactionnels** (pas de marketing hors
newsletter refuge), mais le **transport SMTP réel n'est pas encore branché** :
l'émetteur `infra::email::EmailSender` est aujourd'hui un **no-op loggé**. Les
**gabarits** et les **points de déclenchement** sont, eux, portés et fonctionnels ;
il ne reste qu'à câbler l'envoi effectif.

Plan cible : transport **SMTP** standard (`nodemailer` ou équivalent), provider-agnostique
(on parle SMTP standard, le fournisseur est choisi par configuration).

- **Brevo** recommandé en prod : fournisseur **français** (souveraineté numérique
  européenne · cf. CLAUDE.md), offre **gratuite ~300 emails/jour**, suffisante pour
  le volume MVP.
- **Swappable** vers **OVH**, **Scaleway TEM** ou un **Postfix** auto-hébergé : il
  suffira de changer les variables SMTP.

## Architecture (`src/infra/email/`)

- **`EmailSender`** · l'émetteur. Méthode `async fn send(to_email, to_name, subject, html_body)`.
  Contrat explicite : **ne lève jamais** · un échec d'email ne doit pas casser
  l'opération métier qui l'a déclenché. Implémentation actuelle : `tracing::info!`
  (no-op loggé). Implémentation cible : connexion STARTTLS, envoi,
  échec avalé + loggé.
- **`email::templates`** · gabarits HTML inline (un wrapper commun aux couleurs de
  la marque + un gabarit par événement). **Portés** :
  `application_decision(pet_name, accepted)` et `contract_ready(pet_name, reference)`.

L'émetteur est un provider Nest global (`EmailService`), injecté dans les contrôleurs et services qui notifient.

### L'envoi ne lève jamais

Garantie de conception, à préserver quand le transport SMTP sera branché : que
l'email soit non configuré, envoyé ou en échec, `send(...)` retourne toujours sans
paniquer. Les appelants font `state.email.send(...).await` en fin d'opération sans
`try/catch` ni crainte de rollback.

## Événements déclencheurs

Deux emails sont câblés depuis le module `adoption` (l'appel a lieu, seul le
transport est no-op) :

| Événement | Déclencheur (code) | Gabarit |
| --- | --- | --- |
| **Candidature acceptée** | `adoption::backoffice` · passage du statut candidature à `acceptee` | `templates::application_decision(pet_name, true)` |
| **Candidature refusée** | `adoption::backoffice` · passage à `refusee` | `templates::application_decision(pet_name, false)` |
| **Contrat d'adoption envoyé** | `adoption::contracts` · adoption passant à `envoye` | `templates::contract_ready(pet_name, reference)` |

Le destinataire (email + nom) est résolu via `identity::directory::find_ref(user_id)` ;
si l'utilisateur est introuvable, aucun email n'est tenté. Voir aussi
[CONTRATS.md](CONTRATS.md) pour le cycle de vie des contrats.

Les gabarits produisent un HTML simple, en **français**, aux couleurs de la marque
(wrapper commun · titre vert, pied de page « Dorloter · adoption et protection
animale »).

## Configuration (cible)

Les noms de variables gardent la convention historique (double-underscore) pour
rester compatibles avec l'infra existante. Quand le transport SMTP sera branché,
la configuration lira la section `Dorloter__Email__*` ; en dev, `Host` vide gardera
le comportement « emails seulement loggés ».

**Prod** · les variables `EMAIL_SMTP_*` du fichier d'environnement seront mappées
vers `Dorloter__Email__*` dans `docker-compose.prod.yml` :

| Variable env (`.env.production`) | Clé API |
| --- | --- |
| `EMAIL_SMTP_HOST` | `Dorloter__Email__Host` |
| `EMAIL_SMTP_PORT` (défaut 587) | `Dorloter__Email__Port` |
| `EMAIL_SMTP_USER` | `Dorloter__Email__User` |
| `EMAIL_SMTP_PASSWORD` | `Dorloter__Email__Password` |
| `EMAIL_FROM` (défaut `no-reply@${DOMAIN}`) | `Dorloter__Email__FromEmail` |
| `EMAIL_FROM_NAME` (défaut `Dorloter`) | `Dorloter__Email__FromName` |

Laisser `EMAIL_SMTP_HOST` vide **désactivera** l'envoi (emails loggés) · utile pour
un premier déploiement sans email.

### Activer Brevo en prod (une fois le transport branché)

1. Créer un compte Brevo (gratuit) et un jeu d'identifiants **SMTP** (login + clé SMTP dédiée).
2. Renseigner dans `.env.production` :

   ```env
   EMAIL_SMTP_HOST=smtp-relay.brevo.com
   EMAIL_SMTP_PORT=587
   EMAIL_SMTP_USER=<votre login SMTP Brevo>
   EMAIL_SMTP_PASSWORD=<votre clé SMTP Brevo>
   EMAIL_FROM=no-reply@dorloter.fr
   EMAIL_FROM_NAME=Dorloter
   ```

3. Vérifier le domaine / l'expéditeur côté Brevo (SPF, DKIM) pour la délivrabilité.
4. Redéployer.

Pour un autre fournisseur (OVH, Scaleway TEM, Postfix), seules les valeurs
`EMAIL_SMTP_*` changent.

## Gaps restants (non portés)

- **Transport SMTP de l'email transactionnel** · à brancher (ci-dessus).
- **Web Push (VAPID)** · notifications navigateur (nouveau match perdu/trouvé, mise
  à jour candidature, nouvel animal dans un refuge suivi). Les notifications
  **in-app** (table `notifications`, endpoints portés) restent le canal disponible.

Le centre de notifications **in-app** est le seul canal de notification pleinement
opérationnel à ce jour ; l'email a ses gabarits et ses déclencheurs prêts, en
attente du transport.
