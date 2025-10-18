-- Annuaire des pensions professionnelles agreees (chats/chiens).
-- Pros uniquement (SIRET requis). Seules les fiches is_verified=true sont
-- publiques. Les avis alimentent une note moyenne 1-5.

CREATE TABLE pensions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             varchar(255) NOT NULL,
    slug             varchar(255) NOT NULL,
    description      text,
    siret            varchar(14)  NOT NULL,
    agrement_number  varchar(100),
    address          text,
    location         public.geometry(Point, 4326),
    phone            varchar(20),
    email            varchar(255),
    website          text,
    logo_url         text,
    cover_url        text,
    accepts_cats     boolean      NOT NULL DEFAULT false,
    accepts_dogs     boolean      NOT NULL DEFAULT false,
    capacity_cats    integer,
    capacity_dogs    integer,
    price_per_day_cat numeric(6, 2),
    price_per_day_dog numeric(6, 2),
    services         jsonb,
    opening_hours    text,
    is_verified      boolean      NOT NULL DEFAULT false,
    is_demo          boolean      NOT NULL DEFAULT false,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pensions_slug_key UNIQUE (slug)
);

CREATE INDEX pensions_location_idx ON pensions USING gist (location);
CREATE INDEX pensions_verified_idx ON pensions (is_verified);

CREATE TABLE pension_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pension_id    uuid    NOT NULL REFERENCES pensions (id) ON DELETE CASCADE,
    url           text    NOT NULL,
    blur_data_url text,
    is_primary    boolean NOT NULL DEFAULT false,
    "order"       integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pension_photos_pension_idx ON pension_photos (pension_id);

CREATE TABLE pension_reviews (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pension_id   uuid     NOT NULL REFERENCES pensions (id) ON DELETE CASCADE,
    user_id      uuid     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      text,
    is_verified  boolean  NOT NULL DEFAULT false,
    is_published boolean  NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pension_reviews_pension_user_key UNIQUE (pension_id, user_id)
);

CREATE INDEX pension_reviews_pension_published_idx ON pension_reviews (pension_id, is_published);
