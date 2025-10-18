-- Suivi post-adoption : tâches de relance créées à la signature d'un contrat
-- d'adoption (échéances J+7, J+30, J+90). Le refuge les traite depuis son
-- back-office et les marque faites. Pas de planificateur : les échéances dues
-- sont simplement remontées par requête (due_date <= now et status = a_faire).

CREATE TABLE adoption_followups (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  uuid NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
    shelter_id   uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    pet_id       uuid REFERENCES pets (id) ON DELETE SET NULL,
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,   -- l'adoptant
    label        varchar(60) NOT NULL,                                     -- ex. "Nouvelles à 1 semaine"
    due_date     date NOT NULL,
    status       varchar(20) NOT NULL DEFAULT 'a_faire'
                   CHECK (status IN ('a_faire', 'fait', 'annule')),
    notes        text,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX adoption_followups_shelter_idx ON adoption_followups (shelter_id, status, due_date);
CREATE INDEX adoption_followups_contract_idx ON adoption_followups (contract_id);
