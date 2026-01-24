# Roadmap · back-office refuge (gestion d'association)

Vision : faire du dashboard refuge le **système d'exploitation complet de l'association**, au-delà de l'adoption. Chaque épic = un module (bounded context) + une section de console.

## Déjà en place
Adoption (animaux, candidatures, contrats d'adoption + conventions de famille d'accueil, familles d'accueil), équipe & permissions, messagerie, profil refuge, email transactionnel (Brevo).

## Phase 0 · Socle transverse (débloque le reste)
- Uploads / documents (presign S3 côté API) · prérequis photos médicales, justificatifs, reçus.
- Génération PDF serveur (reçus fiscaux, registre, attestations).
- Tâches planifiées / rappels (tâche de fond async / cron côté API) · échéances, dons récurrents.
- Web Push + transport SMTP réel de l'email (gabarits déjà portés).
- Paiements : **HelloAsso** (français, gratuit pour assos, reçus fiscaux).

## Phase 1 · Suivi médical & sanitaire — FAIT (v1)
Carnet de santé par animal : vaccins, vermifuges, antiparasitaires, stérilisation, tests FIV/FeLV, visites, traitements, pesées. Échéances/rappels (`next_due_date`). Table `health_events` (migration V19), API `/api/v1/shelter/pets/{id}/health` + `/health/upcoming`, console « Santé » (échéances + carnet par animal). À venir : upload d'ordonnances (Phase 0), lien vers le module Veterinarians, rappels email/push.

## Phase 2 · Bénévoles & planning
Recrutement (page publique + candidature), profils bénévoles, créneaux/permanences (promenade, nettoyage, accueil), inscriptions, suivi des heures. Distinct de « Équipe » (accès back-office).

## Phase 3 · Événements & opérations terrain
Collectes (caddie en supermarché), journées d'adoption, portes ouvertes, marchés. Inscriptions bénévoles, visibilité site public, résultats de collecte (kg/€/matériel). S'appuie sur Phase 2, alimente Phase 6.

## Phase 4 · Financement (dons, parrainages, adhésions)
HelloAsso : dons ponctuels/récurrents, **parrainage d'un animal** (non-adoptable), adhésions, reçus fiscaux CERFA. Pages publiques don / parrainer / adhérer.

## Phase 5 · Registre, conformité & statistiques
Cycle de vie animal (entrée : abandon/errance/transfert/saisie ; sortie : adoption/transfert/décès/retour). Registre entrée-sortie (obligation légale FR) en export PDF/CSV. Référence ICAD. Stats pour l'AG et les dossiers de subvention.

## Phase 6 · Stock & besoins
Inventaire (alimentation, litière, médical, matériel) avec seuils d'alerte, alimenté par les collectes. Liste de besoins publique (dons en nature).

## Phase 7 · Communication & fidélisation
Newsletter (Brevo), actualités sur le site public, suivi post-adoption (relances, visite de contrôle · lié au droit de suite des contrats).

## Séquencement
Phase 0 (socle, en partie en parallèle) → 1 Médical (fait) → 2 Bénévoles → 3 Événements → 4 Financement (HelloAsso) → 5 Registre/Stats → 6 Stock → 7 Communication.

## Décisions
- Paiements : HelloAsso (recommandé). · Rappels : tâche de fond interne à l'API. · Ambition : produit de gestion d'asso assumé (au-delà du MVP adoption).
