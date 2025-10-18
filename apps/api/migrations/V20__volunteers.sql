-- Bénévoles et planning des permanences (back-office refuge).

CREATE TABLE volunteers (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id   uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    name         varchar(255) NOT NULL,
    email        varchar(255),
    phone        varchar(40),
    skills       text,
    availability text,
    status       varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('candidate', 'active', 'inactive')),
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX volunteers_shelter_idx ON volunteers (shelter_id);

CREATE TABLE volunteer_shifts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id  uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    title       varchar(200) NOT NULL,
    kind        varchar(20) NOT NULL DEFAULT 'permanence'
                  CHECK (kind IN ('permanence', 'promenade', 'nettoyage', 'accueil', 'transport', 'autre')),
    starts_at   timestamptz NOT NULL,
    ends_at     timestamptz,
    location    varchar(255),
    capacity    integer,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX volunteer_shifts_shelter_idx ON volunteer_shifts (shelter_id, starts_at);

CREATE TABLE shift_signups (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id     uuid NOT NULL REFERENCES volunteer_shifts (id) ON DELETE CASCADE,
    volunteer_id uuid NOT NULL REFERENCES volunteers (id) ON DELETE CASCADE,
    status       varchar(20) NOT NULL DEFAULT 'inscrit' CHECK (status IN ('inscrit', 'present', 'absent')),
    hours        numeric(5, 2),
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (shift_id, volunteer_id)
);
CREATE INDEX shift_signups_shift_idx ON shift_signups (shift_id);
