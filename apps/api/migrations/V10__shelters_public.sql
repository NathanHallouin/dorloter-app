-- Complete le noyau refuges (cree en V3) pour la fiche publique + le suivi.
-- Le back-office detaille (evenements, tags, benevoles, FA, documents...) reste
-- hors perimetre de cette passe de migration (back-office secondaire).

ALTER TABLE shelters
    ADD COLUMN mission_long         text,
    ADD COLUMN founded_year         integer,
    ADD COLUMN location             public.geometry(Point, 4326),
    ADD COLUMN donation_url         text,
    ADD COLUMN donation_label       varchar(80),
    ADD COLUMN donation_description text,
    ADD COLUMN visit_hours          text;

CREATE INDEX shelters_location_idx ON shelters USING gist (location);

CREATE TABLE shelter_follows (
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    shelter_id uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, shelter_id)
);

CREATE INDEX shelter_follows_shelter_idx ON shelter_follows (shelter_id);
