# Email transactionnel

> Source de vérité du stack : **[CLAUDE.md](../CLAUDE.md)**. Cette doc décrit la
> couche d'envoi d'emails de l'API (`apps/api`,
> `Infrastructure/Email/`).

## Vue d'ensemble

L'API envoie quelques **emails transactionnels** (pas de marketing, pas de
newsletter) via **SMTP**, avec la bibliothèque **SMTP**. La couche est
volontairement minimale et **provider-agnostique** : on parle SMTP standard, le
fournisseur est choisi par configuration, sans toucher au code.

- **Brevo** recommandé en prod : fournisseur **français** (souveraineté
  numérique européenne · cf. CLAUDE.md), offre **gratuite ~300 emails/jour**,
  largement suffisante pour le volume MVP.
- **Swappable** sans changement de code vers **OVH**, **Scaleway TEM**, ou un
  **Postfix** auto-hébergé : il suffit de changer les variables SMTP.

## Architecture

`Infrastructure/Email/` :

- **`EmailOptions`** · configuration (section `Dorloter:Email`). Champs : `Host`,
  `Port` (défaut 587), `User`, `Password`, `FromEmail` (défaut
  `no-reply@dorloter.fr`), `FromName` (défaut `Dorloter`). Propriété calculée
  `Configured` = `Host` non vide.
- **`IEmailSender`** · interface :
  `SendAsync(toEmail, toName?, subject, htmlBody, ct)`. Contrat explicite : les
  implémentations **ne doivent jamais lever** · un échec d'email ne casse pas
  l'opération métier qui l'a déclenché.
- **`SmtpEmailSender`** · implémentation SMTP. Connexion `STARTTLS` sur le
  port configuré, authentification, envoi, déconnexion. Enveloppe le tout dans
  un `try/catch` : toute exception est **loggée** (`LogError`) puis avalée.
- **`EmailTemplates`** · gabarits HTML inline (un wrapper commun aux couleurs de
  la marque + un gabarit par événement).

Enregistrement DI (`Program.cs`) :

```csharp
builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection(EmailOptions.SectionName)); // "Dorloter:Email"
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
```

### L'envoi ne lève jamais

C'est une garantie de conception. Deux cas :

1. **Non configuré** (`Host` vide) : `SmtpEmailSender` **n'envoie rien**, loggue
   un `LogInformation` (« Email non configuré, envoi ignoré ») et retourne. Idéal
   en **dev** et en **tests** : aucune dépendance SMTP requise, le code métier
   tourne normalement.
2. **Configuré mais échec** (SMTP injoignable, auth refusée...) : l'exception
   est capturée, loggée en erreur, et `SendAsync` retourne sans relancer.

Conséquence : les appelants peuvent faire `await emailSender.SendAsync(...)` en
fin d'opération sans `try/catch` ni crainte de rollback.

## Événements déclencheurs

Aujourd'hui, trois emails sont émis depuis le module `Adoption` :

| Événement | Déclencheur (code) | Gabarit |
| --- | --- | --- |
| **Candidature acceptée** | `ShelterApplicationService` · passage du statut candidature à `acceptee` | `EmailTemplates.ApplicationDecision(petName, accepted: true)` |
| **Candidature refusée** | `ShelterApplicationService` · passage à `refusee` | `EmailTemplates.ApplicationDecision(petName, accepted: false)` |
| **Contrat d'adoption envoyé** | `ContractService.SetStatusAsync` · adoption passant à `envoye` | `EmailTemplates.ContractReady(petName, reference)` |

Dans les deux services, le destinataire (email + nom) est résolu via
`UserDirectory.FindRefAsync(userId)` ; si l'utilisateur est introuvable, aucun
email n'est tenté. Voir aussi [CONTRATS.md](CONTRATS.md) pour le cycle de vie
des contrats.

Les gabarits produisent un HTML simple, en **français**, aux couleurs de la
marque (`EmailTemplates.Wrap` · titre vert, pied de page « Dorloter · adoption
et protection animale »).

## Configuration

Section `Dorloter:Email` (binding double-underscore en variables
d'environnement).

**Dev** · défauts dans `apps/api/.../appsettings.json` :

```json
"Dorloter": {
  "Email": {
    "Host": "",
    "Port": 587,
    "User": "",
    "Password": "",
    "FromEmail": "no-reply@dorloter.fr",
    "FromName": "Dorloter"
  }
}
```

`Host` vide par défaut → en dev, **les emails sont seulement loggés** (voir
ci-dessus). Rien à configurer pour développer.

**Prod** · les variables `EMAIL_SMTP_*` du fichier d'environnement sont mappées
vers `Dorloter__Email__*` dans `docker-compose.prod.yml` :

| Variable env (`.env.production`) | Clé NestJS |
| --- | --- |
| `EMAIL_SMTP_HOST` | `Dorloter__Email__Host` |
| `EMAIL_SMTP_PORT` (défaut 587) | `Dorloter__Email__Port` |
| `EMAIL_SMTP_USER` | `Dorloter__Email__User` |
| `EMAIL_SMTP_PASSWORD` | `Dorloter__Email__Password` |
| `EMAIL_FROM` (défaut `no-reply@${DOMAIN}`) | `Dorloter__Email__FromEmail` |
| `EMAIL_FROM_NAME` (défaut `Dorloter`) | `Dorloter__Email__FromName` |

Modèle : `.env.production.example`. Laisser `EMAIL_SMTP_HOST` vide **désactive**
l'envoi (emails loggés) · utile pour un premier déploiement sans email.

### Activer Brevo en prod

1. Créer un compte Brevo (gratuit) et un jeu d'identifiants **SMTP** (Brevo
   fournit un login SMTP et une clé SMTP dédiée).
2. Renseigner dans `.env.production` :

   ```env
   EMAIL_SMTP_HOST=smtp-relay.brevo.com
   EMAIL_SMTP_PORT=587
   EMAIL_SMTP_USER=<votre login SMTP Brevo>
   EMAIL_SMTP_PASSWORD=<votre clé SMTP Brevo>
   EMAIL_FROM=no-reply@dorloter.fr
   EMAIL_FROM_NAME=Dorloter
   ```

3. Vérifier le domaine / l'expéditeur côté Brevo (SPF, DKIM) pour la
   délivrabilité.
4. Redéployer · SMTP se connecte en STARTTLS sur le port 587.

Pour un autre fournisseur (OVH, Scaleway TEM, Postfix), seules les valeurs
`EMAIL_SMTP_*` changent.

## Gaps restants (non portés)

Ces canaux de notification, présents dans la vision produit, **ne sont pas
encore implémentés** dans l'API :

- **Web Push (VAPID)** · notifications navigateur (nouveau match perdu/trouvé,
  mise à jour candidature, nouvel animal dans un refuge suivi). À reloger depuis
  l'ancien front Next.js retiré (cf. CLAUDE.md). Les notifications **in-app**
  (table `notifications`) restent le canal disponible.
- **Gifs** · service de gifs de l'ancien front, pas encore porté.

L'email transactionnel décrit ici est le seul canal de notification **sortant**
opérationnel à ce jour.
