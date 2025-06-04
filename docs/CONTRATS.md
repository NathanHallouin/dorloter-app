# Contrats · adoption et famille d'accueil

> Source de vérité du stack : **[CLAUDE.md](../CLAUDE.md)**. Cette doc décrit la
> fonctionnalité **Contrats** telle qu'implémentée dans l'API
> (`apps/api`, module `Adoption`) et le back-office refuge (`apps/pro`).

## Objectif

Permettre aux refuges et associations de produire deux documents juridiques
courants, sans logiciel tiers :

1. **Contrat d'adoption** · l'engagement signé entre le refuge et l'adoptant à
   la remise de l'animal (frais d'adoption, clauses de stérilisation, droit de
   suite, non-abandon, restitution...).
2. **Convention de famille d'accueil** (foster) · l'accord entre l'association
   et un bénévole qui héberge temporairement un animal (l'animal reste la
   propriété de l'asso, frais vétérinaires pris en charge...).

Les deux sont gérés par une **table unifiée** (`contracts`, colonne `type`), un
même service, un même contrôleur et une même page back-office. Le document final
est **imprimable** (vue HTML format A4 · « Imprimer / PDF » du navigateur). Pas
de signature électronique en MVP : la signature reste manuscrite sur le document
imprimé.

## Modèle de données

Table `contracts` (migration `apps/api/.../Migrations/V18__contracts.sql`,
entité `Modules/Adoption/Domain/Contract.cs`). Une seule table couvre les deux
types.

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | uuid (pk) | identifiant |
| `type` | varchar(20) | `adoption` ou `foster` (`ContractType`) |
| `status` | varchar(20) | cycle de vie, défaut `brouillon` (`ContractStatus`) |
| `shelter_id` | uuid (fk → shelters) | refuge propriétaire, `ON DELETE CASCADE` |
| `user_id` | uuid (fk → users) | la **contrepartie** : l'adoptant (adoption) ou le bénévole famille d'accueil (foster), `ON DELETE RESTRICT` |
| `pet_id` | uuid (fk → pets) | animal concerné · nullable (une convention foster peut être créée sans animal précis), `ON DELETE SET NULL` |
| `application_id` | uuid (fk → applications) | candidature d'origine (adoption générée depuis une candidature acceptée), nullable |
| `foster_family_id` | uuid (fk → foster_families) | famille d'accueil liée (foster), nullable |
| `reference` | varchar(40) | référence lisible, unique par refuge (ex. `ADO-20260616-A1B2C3`) |
| `effective_date` | date | date d'adoption / début d'accueil, nullable |
| `end_date` | date | fin d'accueil prévue (foster), nullable |
| `adoption_fee` | numeric(8,2) | frais d'adoption, nullable (adoption uniquement) |
| `terms` | jsonb | **clauses cochées** (`{ "clé": true/false }`), défaut `{}` |
| `notes` | text | clauses particulières en texte libre, nullable |
| `signed_at` | timestamptz | horodatage de signature / activation, nullable |
| `created_at`, `updated_at` | timestamptz | `ITimestamped` (stampés par le DbContext) |

Index : `shelter_id`, `user_id`, `pet_id`, et un **unique** `(shelter_id, reference)`.

Les **clauses** ne sont pas des colonnes : elles vivent dans `terms` (jsonb), un
dictionnaire `clé -> bool`. Le catalogue des clés et leurs libellés est défini
côté front (`apps/pro/.../shelter/contract-clauses.ts`), ce qui permet d'ajuster
le texte sans migration. L'API stocke et restitue le jsonb tel quel.

## Cycle de vie des statuts

L'enum `ContractStatus` est commun aux deux types ; chaque type n'en utilise
qu'un sous-ensemble (les transitions sont pilotées par le front, via l'endpoint
`status`).

**Adoption**

```
brouillon ──"Envoyer"──▶ envoye ──"Marquer signé"──▶ signe ──"Résilier"──▶ resilie
```

**Famille d'accueil (foster)**

```
brouillon ──"Activer"──▶ active ──"Terminer"──▶ terminee
```

`annule` existe dans l'enum comme statut commun mais n'est pas exposé par les
boutons du back-office actuel.

## Effets métier

- **Signature d'une adoption** (`type=adoption`, passage à `signe`) : l'animal
  lié (`pet_id`) bascule automatiquement au statut **`adopte`**
  (`PetStatus.Adopte`). Voir `ContractService.SetStatusAsync`.
- **Envoi d'une adoption** (passage à `envoye`) : déclenche un **email** à
  l'adoptant (« votre contrat est prêt », gabarit `EmailTemplates.ContractReady`).
  Voir [EMAIL.md](EMAIL.md).
- **Signature / activation** (`signe` ou `active`) : `signed_at` est horodaté
  (une seule fois, `??=`).
- **Frais par défaut** : à la création d'une adoption, si aucun frais n'est
  fourni, on reprend `pet.adoption_fee`.
- **Modification** : seul un contrat en `brouillon` est modifiable (clauses,
  frais, dates, notes). Une fois envoyé / actif, il est figé.

## Permissions

L'autorisation passe par **`ShelterMembership.RequireAccessAsync`** (permissions
d'équipe, pas le rôle JWT · un membre invité a `role=user` mais des permissions),
avec des permissions différentes selon le type :

| Action | Adoption | Foster |
| --- | --- | --- |
| Lister / consulter | `ApplicationsRead` | `ApplicationsRead` |
| Créer / modifier / changer le statut | `ApplicationsWrite` | `FostersWrite` |

Tout contrat dont le `shelter_id` ne correspond pas au refuge de l'utilisateur
renvoie `Forbidden`. Les permissions sont résolues dynamiquement à partir du
`type` du contrat dans `GetWritableAsync`.

## Endpoints · `/api/v1/shelter/contracts`

Contrôleur `Modules/Adoption/Web/ContractController.cs`, DTOs dans
`ContractDtos.cs`. Enveloppe standard `{ data }`.

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/` | liste les contrats du refuge (tri `created_at` desc) |
| `GET` | `/{id}` | détail d'un contrat (vue enrichie) |
| `POST` | `/adoption` | crée un contrat d'adoption en brouillon |
| `POST` | `/foster` | crée une convention de famille d'accueil en brouillon |
| `PATCH` | `/{id}` | met à jour un brouillon (frais, dates, clauses, notes) |
| `POST` | `/{id}/status` | change le statut (`{ status }`) |

**Création adoption** (`CreateAdoptionContractRequest`) : soit `applicationId`
(la candidature résout `pet` + adoptant + frais par défaut), soit le couple
`petId` + `userId`. Sinon `Unprocessable`. L'animal doit appartenir au refuge.

**Création foster** (`CreateFosterContractRequest`) : `fosterFamilyId` requis
(doit appartenir au refuge), `petId` optionnel, `effectiveDate` / `endDate`
optionnelles. La contrepartie (`user_id`) est déduite de la famille d'accueil.

Le DTO de réponse (`ContractDto`) enrichit l'entité avec les noms résolus pour
l'affichage et le document : `petName`, `adopterName`, `adopterEmail`,
`shelterName`. Le champ `terms` est renvoyé en `JsonElement` (objet brut).

## Front (back-office refuge · `apps/pro`)

Client typé : `packages/client/src/api/contracts.ts` (`contractsApi`).

**Page liste** · `apps/pro/.../shelter/ShelterContractsPage.tsx`

- Panneau **« Générer un contrat »** :
  - Adoption : liste les **candidatures acceptées** sans contrat encore généré
    (`status === "acceptee"` et pas déjà liées) · bouton « Générer » →
    `createAdoption({ applicationId })`.
  - Famille d'accueil : liste les familles d'accueil · sélection d'un animal
    optionnel parmi les pets `disponible`/`reserve` · bouton « Convention » →
    `createFoster`.
- Filtres : tous / adoption / famille d'accueil.
- Chaque contrat affiche référence, type, animal, adoptant, statut (badge coloré),
  frais, et des boutons d'action contextuels au statut (cf. cycle de vie).
- **Édition des clauses** (brouillon uniquement) : cases à cocher (catalogue
  `clausesFor(type)`), frais d'adoption, date d'adoption / début d'accueil, fin
  prévue (foster), notes libres · « Enregistrer les clauses » → `update`.
- Lien **« Document »** vers la vue imprimable (nouvel onglet).

**Document imprimable** · `apps/pro/.../shelter/ContractDocumentPage.tsx`
(route `/refuge/contrats/{id}/document`)

- Mise en page **feuille A4** (en-tête refuge, titre, parties, encadré animal /
  frais / dates, liste des engagements cochés, notes, deux blocs de signature).
- Bouton « Imprimer / PDF » (`window.print()`), barre d'actions masquée à
  l'impression (`print:hidden`).
- Titre et libellés adaptés au type (« Contrat d'adoption » / « Convention de
  famille d'accueil », « L'adoptant·e » / « La famille d'accueil »).

Le lien vers les contrats est accessible depuis le dashboard refuge.

## Clauses standard (FR)

Catalogue dans `apps/pro/.../shelter/contract-clauses.ts`. La clé est persistée
dans `terms`, le libellé sert au formulaire et au document.

**Adoption** (`ADOPTION_CLAUSES`) :

- Animal identifié (puce ou tatouage), identification à jour
- Vaccinations à jour à la remise de l'animal
- Animal stérilisé
- Engagement de stérilisation (si non encore stérilisé)
- Certificat d'engagement et de connaissance signé (loi du 30 nov. 2021)
- Engagement de ne jamais abandonner l'animal
- Restitution au refuge en cas d'impossibilité de garder l'animal
- Droit de suite du refuge (nouvelles, visite de contrôle possible)
- Interdiction de revendre ou céder l'animal à un tiers

**Famille d'accueil** (`FOSTER_CLAUSES`) :

- L'animal reste la propriété de l'association
- Frais vétérinaires pris en charge par l'association
- Alimentation et matériel fournis par l'association
- Soins quotidiens et bien-être assurés par la famille d'accueil
- Restitution de l'animal sur demande de l'association
- Interdiction de céder ou confier l'animal à un tiers

> Ces clauses sont des **modèles** par défaut. Le refuge coche celles qui
> s'appliquent et ajoute ses clauses particulières dans le champ notes. Ce ne
> sont pas un avis juridique.
