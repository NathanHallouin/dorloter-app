# Registre des activités de traitement

Registre tenu au titre de l'**article 30 du RGPD**. Il est obligatoire pour Dorloter malgré l'effectif réduit : l'exemption des organismes de moins de 250 personnes tombe dès lors que le traitement n'est pas occasionnel et qu'il porte sur de la **géolocalisation** à l'échelle de la plateforme.

> Ce registre est pré-rempli à partir du modèle de données réel (`apps/api/src/infra/database/schema.ts` et les migrations). Il doit être **relu et complété** par l'éditeur avant d'être opposable : les champs marqués `À COMPLÉTER` dépendent d'informations que seul l'éditeur détient. Toute évolution du schéma ou des durées de purge (`identity/retention.service.ts`) doit y être répercutée, ainsi que dans la politique de confidentialité publiée.

## Responsable du traitement

| Champ | Valeur |
|---|---|
| Organisme | `À COMPLÉTER` · raison sociale de l'association |
| Forme juridique | Association loi 1901 |
| Adresse | `À COMPLÉTER` · siège social |
| Représentant légal | `À COMPLÉTER` · nom, prénom, qualité |
| Contact données personnelles | `À COMPLÉTER` · adresse email dédiée |
| Délégué à la protection des données | Non désigné. La désignation n'est pas obligatoire ici (pas d'autorité publique, pas de suivi systématique à grande échelle au sens de l'art. 37), mais elle devient recommandée si l'audience croît fortement. |
| Date de dernière mise à jour | 16 mai 2026 |

## Mesures de sécurité communes

Applicables à l'ensemble des traitements ci-dessous :

- Chiffrement des échanges en HTTPS (TLS, HSTS activé).
- Mots de passe conservés sous forme d'empreintes scrypt, jamais en clair.
- Accès applicatif à la base via un rôle aux privilèges restreints, distinct du rôle d'administration (`scripts/init-db-roles.sql`).
- Authentification par jeton JWT à durée courte, jetons de rafraîchissement stockés hachés et révocables.
- Cloisonnement des accès professionnels par permissions d'équipe, contrôlées côté API.
- Sauvegardes quotidiennes vers un stockage objet européen distinct du serveur de production.
- Hébergement en France, aucun transfert hors Union européenne.
- Purge automatique quotidienne des données arrivées à échéance.
- Suivi d'activité des comptes (`last_seen_at`) limité au strict nécessaire à la politique de conservation : une écriture par jour et par compte, aucune trace de navigation.

## Sous-traitants

| Sous-traitant | Rôle | Localisation | Contrat art. 28 |
|---|---|---|---|
| OVH SAS | Hébergement serveurs, base de données, sauvegardes | France | `À COMPLÉTER` · DPA à récupérer |
| Brevo | Acheminement des emails transactionnels | France | `À COMPLÉTER` · DPA à récupérer |
| Fournisseur de fonds cartographiques | Affichage des cartes (reçoit l'IP au chargement des tuiles) | `À COMPLÉTER` selon le fournisseur retenu | `À COMPLÉTER` |

## Traitements

### T1 · Gestion des comptes utilisateurs

| | |
|---|---|
| **Finalité** | Créer et sécuriser un compte, identifier la personne, lui donner accès aux fonctions réservées (candidater, signaler, échanger, gérer une structure). |
| **Base légale** | Exécution du contrat (art. 6.1.b) · les conditions générales d'utilisation. |
| **Personnes concernées** | Adoptants, personnes signalant un animal, membres d'équipe des refuges et pensions. |
| **Catégories de données** | Email, nom, empreinte du mot de passe, rôle. Facultatifs : téléphone, photo de profil, ville, biographie, position approximative, rayon d'alerte. |
| **Destinataires** | Équipe Dorloter (exploitation et modération). Le nom et la photo sont visibles des structures contactées. |
| **Durée** | Jusqu'à suppression par la personne, ou **3 ans d'inactivité** suivis d'une relance par email et d'un délai de grâce de 30 jours. Suppression immédiate et totale, sauf contrat signé (voir T7) qui déclenche une anonymisation. Les comptes rattachés à une structure sont exclus de la suppression automatique. |
| **Transfert hors UE** | Aucun. |

### T2 · Signalements d'animaux perdus et trouvés

| | |
|---|---|
| **Finalité** | Publier une alerte géolocalisée et calculer automatiquement les rapprochements entre signalements « perdu » et « trouvé ». |
| **Base légale** | Intérêt légitime (art. 6.1.f) · retrouver un animal perdu, sur la base d'une publication initiée volontairement par la personne. |
| **Personnes concernées** | Toute personne déposant un signalement. |
| **Catégories de données** | Description physique de l'animal, race, couleur, sexe, identification, signes distinctifs, photographies, **localisation précise** du lieu de perte ou de découverte, adresse lisible, date, coordonnées de contact facultatives, notes. |
| **Destinataires** | Public pour la fiche et la carte. **Les coordonnées de contact ne sont jamais exposées** dans les listes ni sur la carte : elles transitent par un endpoint de révélation dédié, réservé aux personnes connectées et au cas par cas. |
| **Durée** | Bascule en « expiré » après 12 mois sans activité, suppression 12 mois après résolution ou expiration. |
| **Transfert hors UE** | Aucun. |
| **Point d'attention** | Traitement de localisation à grande échelle · principal motif d'obligation du présent registre. |

### T3 · Candidatures à l'adoption

| | |
|---|---|
| **Finalité** | Permettre à un refuge d'apprécier l'adéquation entre un animal et un foyer. |
| **Base légale** | Mesures précontractuelles prises à la demande de la personne (art. 6.1.b). |
| **Personnes concernées** | Candidats à l'adoption. |
| **Catégories de données** | Type de logement, accès extérieur, présence d'autres animaux, **présence et âge des enfants**, expérience, motivation, disponibilités. Notes internes ajoutées par le refuge. |
| **Destinataires** | Le refuge destinataire de la candidature, exclusivement. |
| **Durée** | 3 ans après clôture du dossier (délai de contestation). |
| **Transfert hors UE** | Aucun. |
| **Point d'attention** | Les données relatives aux enfants du foyer appellent une vigilance particulière : ne pas les exposer au-delà du refuge concerné. |

### T4 · Messagerie entre particuliers et structures

| | |
|---|---|
| **Finalité** | Échanger au sujet d'un animal, d'une candidature ou d'une réservation. |
| **Base légale** | Exécution du contrat (art. 6.1.b). |
| **Personnes concernées** | Adoptants et membres d'équipe des structures. |
| **Catégories de données** | Contenu des messages, pièces jointes, horodatages, accusés de lecture. |
| **Destinataires** | Les seuls participants à la conversation. |
| **Durée** | 3 ans après le dernier échange, puis suppression de la conversation et de ses messages. |
| **Transfert hors UE** | Aucun. |

### T5 · Réservations et avis sur les pensions

| | |
|---|---|
| **Finalité** | Transmettre une demande de garde à une pension et recueillir les avis publiés. |
| **Base légale** | Mesures précontractuelles (art. 6.1.b) pour la réservation ; intérêt légitime (art. 6.1.f) pour les avis. |
| **Personnes concernées** | Propriétaires d'animaux. |
| **Catégories de données** | Dates de garde, espèce et nom de l'animal, notes, note et commentaire d'avis. |
| **Destinataires** | La pension concernée ; le public pour les avis publiés. |
| **Durée** | Supprimées avec le compte. |
| **Transfert hors UE** | Aucun. |

### T6 · Alertes de proximité

| | |
|---|---|
| **Finalité** | Signaler à la personne les nouveautés publiées autour de chez elle. |
| **Base légale** | **Consentement** (art. 6.1.a), recueilli et retirable depuis le profil, sans justification et sans conséquence sur le reste du service. |
| **Personnes concernées** | Utilisateurs ayant activé l'option. |
| **Catégories de données** | Position approximative, rayon en kilomètres, préférence d'activation. |
| **Destinataires** | Traitement interne, aucun destinataire externe. |
| **Durée** | Jusqu'au retrait du consentement ou à la suppression du compte. |
| **Transfert hors UE** | Aucun. |

### T7 · Contrats d'adoption et suivi post-adoption

| | |
|---|---|
| **Finalité** | Formaliser une adoption ou un accueil en famille d'accueil, et assurer les relances de suivi. |
| **Base légale** | Exécution du contrat (art. 6.1.b), puis intérêt légitime à conserver la preuve de l'engagement. |
| **Personnes concernées** | Adoptants, familles d'accueil. |
| **Catégories de données** | Identité de l'adoptant, animal concerné, référence, dates, frais d'adoption, clauses acceptées, notes, échéances de suivi. |
| **Destinataires** | Le refuge signataire. |
| **Durée** | **5 ans** à compter de la fin du contrat. Cette conservation prime sur une demande d'effacement : le compte est alors anonymisé, le contrat subsistant sans lien avec une personne identifiable. |
| **Transfert hors UE** | Aucun. |

### T8 · Bénévolat et événements

| | |
|---|---|
| **Finalité** | Gérer les inscriptions aux créneaux de bénévolat et aux événements des refuges. |
| **Base légale** | Exécution du contrat (art. 6.1.b) ou intérêt légitime du refuge organisateur. |
| **Personnes concernées** | Bénévoles et participants. |
| **Catégories de données** | Identité, coordonnées, créneaux et événements retenus, statut de l'inscription. |
| **Destinataires** | Le refuge organisateur. |
| **Durée** | Fiche bénévole passée en `inactive` : **3 ans**, purge automatique. Les inscriptions suivent la fiche par cascade. |
| **Transfert hors UE** | Aucun. |

### T9 · Modération et signalement de contenus

| | |
|---|---|
| **Finalité** | Recevoir et traiter les signalements de contenus illicites ou trompeurs. |
| **Base légale** | Obligation légale (art. 6.1.c · LCEN) et intérêt légitime à la sécurité du service. |
| **Personnes concernées** | Auteur du signalement, auteur du contenu visé. |
| **Catégories de données** | Contenu visé, motif, identité de l'auteur du signalement et du modérateur ayant statué. |
| **Destinataires** | Équipe de modération de la plateforme. |
| **Durée** | **12 mois** après traitement (statut `masque` ou `rejete`), purge automatique. |
| **Transfert hors UE** | Aucun. |

### T10 · Vérification des professionnels

| | |
|---|---|
| **Finalité** | Contrôler manuellement le SIRET et l'agrément préfectoral d'une pension ou d'un refuge avant publication. |
| **Base légale** | Obligation légale et intérêt légitime à ne référencer que des structures habilitées. |
| **Personnes concernées** | Représentants des structures professionnelles. |
| **Catégories de données** | Raison sociale, SIRET, numéro d'agrément, coordonnées professionnelles. |
| **Destinataires** | Équipe Dorloter. |
| **Durée** | Durée du référencement, puis archivage `À COMPLÉTER`. |
| **Transfert hors UE** | Aucun. |
| **Remarque** | Données professionnelles, faiblement identifiantes à titre personnel. |

### T11 · Sécurité et journalisation technique

| | |
|---|---|
| **Finalité** | Détecter les abus, diagnostiquer les incidents, assurer la sécurité du service. |
| **Base légale** | Intérêt légitime (art. 6.1.f) et obligation de conservation des données de connexion. |
| **Personnes concernées** | Tout visiteur, connecté ou non. |
| **Catégories de données** | Adresse IP, navigateur, URL appelée, horodatage. Pour les jetons de rafraîchissement : IP et navigateur d'émission. |
| **Destinataires** | Équipe technique. |
| **Durée** | **12 mois** au maximum · purge assurée par Caddy (`roll_keep_for 8760h`). Jetons de rafraîchissement supprimés dès expiration ou révocation. |
| **Transfert hors UE** | Aucun. |

## Traitements écartés

Pour mémoire, et parce que leur absence est un choix :

- **Mesure d'audience** · aucune. Aucun cookie non essentiel n'est déposé, ce qui dispense de bandeau de consentement. Cette exemption tombe dès l'ajout d'un outil d'analytics.
- **Publicité et profilage commercial** · aucun.
- **Décision automatisée produisant des effets juridiques** (art. 22) · aucune. Le score de rapprochement perdu/trouvé est une aide au tri, sans effet juridique et sans décision prise sans intervention humaine.
- **Données sensibles** (art. 9) · aucune n'est collectée. Les données de santé traitées concernent les **animaux**, qui ne sont pas des personnes au sens du RGPD.
