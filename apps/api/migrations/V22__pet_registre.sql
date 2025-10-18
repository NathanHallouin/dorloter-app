-- Registre d'entrée et de sortie des animaux (obligation légale des refuges).
-- Champs ajoutés à pets : provenance et date d'entrée, motif et date de sortie,
-- identification ICAD.

ALTER TABLE pets
    ADD COLUMN IF NOT EXISTS icad_number   varchar(15),
    ADD COLUMN IF NOT EXISTS intake_date   date,
    ADD COLUMN IF NOT EXISTS intake_origin varchar(30)
        CHECK (intake_origin IN ('abandon', 'errance', 'transfert', 'saisie', 'naissance', 'autre')),
    ADD COLUMN IF NOT EXISTS intake_notes  text,
    ADD COLUMN IF NOT EXISTS outcome_date  date,
    ADD COLUMN IF NOT EXISTS outcome_type  varchar(30)
        CHECK (outcome_type IN ('adoption', 'transfert', 'deces', 'retour_proprietaire', 'euthanasie', 'autre')),
    ADD COLUMN IF NOT EXISTS outcome_notes text;

-- Animaux présents (sans sortie) = occupation courante.
CREATE INDEX IF NOT EXISTS pets_present_idx ON pets (shelter_id) WHERE outcome_date IS NULL;
