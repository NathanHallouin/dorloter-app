-- Domaine perdus/trouves + matching geographique (PostGIS).
--
-- Le type geometry vit dans le schema public (extension PostGIS) : on le
-- qualifie explicitement car Flyway migre avec un search_path limite a
-- dorloter_api. Les fonctions ST_* utilisees au runtime (matching) sont
-- resolues via le search_path "dorloter_api, public" (cf. Hikari).

CREATE TABLE reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type                varchar(16)  NOT NULL CHECK (type IN ('perdu', 'trouve')),
    status              varchar(16)  NOT NULL DEFAULT 'actif'
                            CHECK (status IN ('actif', 'resolu', 'expire')),
    species             varchar(16)  NOT NULL CHECK (species IN ('chat', 'chien')),
    pet_name            varchar(255),
    description         text         NOT NULL,
    breed               varchar(100),
    color               varchar(100),
    sex                 varchar(16)  NOT NULL DEFAULT 'inconnu'
                            CHECK (sex IN ('male', 'femelle', 'inconnu')),
    is_chipped          boolean      NOT NULL DEFAULT false,
    chip_number         varchar(50),
    distinctive_signs   text,
    location            public.geometry(Point, 4326) NOT NULL,
    address             text,
    date_event          date         NOT NULL,
    contact_phone       varchar(20),
    contact_email       varchar(255),
    notes               text,
    resolved_at         timestamptz,
    resolved_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    created_at          timestamptz  NOT NULL DEFAULT now(),
    updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX reports_type_status_idx ON reports (type, status);
CREATE INDEX reports_date_event_idx ON reports (date_event);
-- Index spatial GIST : requetes de proximite (ST_DWithin) et matching.
CREATE INDEX reports_location_idx ON reports USING gist (location);

CREATE TABLE report_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id     uuid    NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    url           text    NOT NULL,
    blur_data_url text,
    is_primary    boolean NOT NULL DEFAULT false,
    "order"       integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX report_photos_report_idx ON report_photos (report_id);

CREATE TABLE report_matches (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_report_id  uuid          NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    found_report_id uuid          NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    score           numeric(5, 2) NOT NULL,
    distance_meters integer,
    status          varchar(16)   NOT NULL DEFAULT 'suggere'
                        CHECK (status IN ('suggere', 'confirme', 'rejete')),
    created_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT report_matches_pair_key UNIQUE (lost_report_id, found_report_id)
);

CREATE INDEX report_matches_lost_idx ON report_matches (lost_report_id);
CREATE INDEX report_matches_found_idx ON report_matches (found_report_id);
