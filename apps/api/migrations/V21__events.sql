-- Événements et opérations terrain (collectes, journées d'adoption, portes
-- ouvertes, marchés, sensibilisation). Back-office refuge.

CREATE TABLE events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id    uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    title         varchar(200) NOT NULL,
    type          varchar(30) NOT NULL DEFAULT 'collecte' CHECK (type IN (
                    'collecte', 'journee_adoption', 'porte_ouverte', 'marche',
                    'sensibilisation', 'autre')),
    starts_at     timestamptz NOT NULL,
    ends_at       timestamptz,
    location      varchar(255),
    is_public     boolean NOT NULL DEFAULT false,
    capacity      integer,
    needs         text,
    notes         text,
    result_amount numeric(10, 2),
    result_notes  text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_shelter_idx ON events (shelter_id, starts_at);
CREATE INDEX events_public_idx ON events (is_public, starts_at) WHERE is_public;

CREATE TABLE event_signups (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    volunteer_id uuid NOT NULL REFERENCES volunteers (id) ON DELETE CASCADE,
    status       varchar(20) NOT NULL DEFAULT 'inscrit' CHECK (status IN ('inscrit', 'present', 'absent')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, volunteer_id)
);
CREATE INDEX event_signups_event_idx ON event_signups (event_id);
