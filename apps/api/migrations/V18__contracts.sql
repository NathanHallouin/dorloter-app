-- Contrats : contrat d'adoption + convention de famille d'accueil (back-office refuge).
-- Table unifiee (type = adoption | foster), branchee sur l'existant
-- (applications, foster_families). Les clauses sont stockees en jsonb (terms).

CREATE TABLE contracts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type              varchar(20) NOT NULL CHECK (type IN ('adoption', 'foster')),
    status            varchar(20) NOT NULL DEFAULT 'brouillon'
                        CHECK (status IN ('brouillon', 'envoye', 'signe', 'active', 'terminee', 'resilie', 'annule')),
    shelter_id        uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    pet_id            uuid REFERENCES pets (id) ON DELETE SET NULL,
    application_id    uuid REFERENCES applications (id) ON DELETE SET NULL,
    foster_family_id  uuid REFERENCES foster_families (id) ON DELETE SET NULL,
    reference         varchar(40) NOT NULL,
    effective_date    date,
    end_date          date,
    adoption_fee      numeric(8, 2),
    terms             jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes             text,
    signed_at         timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contracts_shelter_idx ON contracts (shelter_id);
CREATE INDEX contracts_user_idx ON contracts (user_id);
CREATE INDEX contracts_pet_idx ON contracts (pet_id);
CREATE UNIQUE INDEX contracts_reference_idx ON contracts (shelter_id, reference);
