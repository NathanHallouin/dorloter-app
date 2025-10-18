-- Suivi médical et sanitaire des animaux (back-office refuge).
-- Journal d'événements de santé par animal : vaccins, vermifuges, stérilisation,
-- tests, visites véto, traitements, pesées. next_due_date porte les rappels.

CREATE TABLE health_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id        uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
    type          varchar(30) NOT NULL CHECK (type IN (
                    'vaccin', 'vermifuge', 'antiparasitaire', 'sterilisation',
                    'test_fiv_felv', 'visite', 'traitement', 'pesee', 'autre')),
    event_date    date NOT NULL DEFAULT current_date,
    label         varchar(200),
    vet_label     varchar(200),
    result        text,
    next_due_date date,
    cost          numeric(8, 2),
    weight_kg     numeric(5, 2),
    notes         text,
    document_url  text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX health_events_pet_idx ON health_events (pet_id, event_date DESC);
-- Pour la vue « échéances à venir » (vaccins/vermifuges à refaire).
CREATE INDEX health_events_due_idx ON health_events (next_due_date) WHERE next_due_date IS NOT NULL;
