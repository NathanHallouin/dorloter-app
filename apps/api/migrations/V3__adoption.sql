-- Domaine adoption + refuges (noyau minimal pour les refuges, etendu en Phase 4).
-- Enums metier stockes en varchar + CHECK (convention du projet, cf. Phase 1).

-- ─── Refuges (minimal : juste de quoi afficher la fiche dans le catalogue) ───
CREATE TABLE shelters (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    slug        varchar(255) NOT NULL,
    description text,
    siret       varchar(14),
    address     text,
    phone       varchar(20),
    email       varchar(255),
    website     text,
    logo_url    text,
    cover_url   text,
    is_verified boolean      NOT NULL DEFAULT false,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT shelters_slug_key UNIQUE (slug)
);

-- ─── Animaux a adopter ──────────────────────────────────────────────────────
CREATE TABLE pets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id      uuid         NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    species         varchar(16)  NOT NULL CHECK (species IN ('chat', 'chien')),
    name            varchar(255) NOT NULL,
    description     text,
    breed           varchar(100),
    color           varchar(100),
    sex             varchar(16)  NOT NULL DEFAULT 'inconnu'
                        CHECK (sex IN ('male', 'femelle', 'inconnu')),
    age_category    varchar(16)  CHECK (age_category IN ('chaton', 'jeune', 'adulte', 'senior')),
    estimated_birth date,
    is_sterilized   boolean      NOT NULL DEFAULT false,
    is_chipped      boolean      NOT NULL DEFAULT false,
    is_vaccinated   boolean      NOT NULL DEFAULT false,
    fiv_felv        varchar(20)  CHECK (fiv_felv IN ('negatif', 'fiv_positif', 'felv_positif',
                                                     'fiv_felv_positif', 'non_teste')),
    indoor_only     boolean,
    ok_with_cats    varchar(8)   NOT NULL DEFAULT 'inconnu' CHECK (ok_with_cats IN ('oui', 'non', 'inconnu')),
    ok_with_dogs    varchar(8)   NOT NULL DEFAULT 'inconnu' CHECK (ok_with_dogs IN ('oui', 'non', 'inconnu')),
    ok_with_children varchar(8)  NOT NULL DEFAULT 'inconnu' CHECK (ok_with_children IN ('oui', 'non', 'inconnu')),
    special_needs   text,
    status          varchar(16)  NOT NULL DEFAULT 'disponible'
                        CHECK (status IN ('pre_adoptable', 'disponible', 'reserve', 'adopte', 'retire')),
    adoption_fee    numeric(8, 2),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX pets_shelter_id_idx ON pets (shelter_id);
CREATE INDEX pets_status_idx ON pets (status);
CREATE INDEX pets_species_status_idx ON pets (species, status);
-- Index support du tri/curseur (created_at DESC, id DESC).
CREATE INDEX pets_created_id_idx ON pets (created_at DESC, id DESC);

CREATE TABLE pet_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id        uuid    NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
    url           text    NOT NULL,
    blur_data_url text,
    is_primary    boolean NOT NULL DEFAULT false,
    "order"       integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pet_photos_pet_idx ON pet_photos (pet_id);

CREATE TABLE favorites (
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pet_id     uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pet_id)
);

CREATE INDEX favorites_user_id_idx ON favorites (user_id);

CREATE TABLE applications (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id             uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
    user_id            uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status             varchar(16) NOT NULL DEFAULT 'envoyee'
                           CHECK (status IN ('envoyee', 'en_cours', 'acceptee', 'refusee', 'annulee')),
    housing_type       varchar(16) CHECK (housing_type IN ('appartement', 'maison', 'autre')),
    has_outdoor_access boolean DEFAULT false,
    has_other_pets     text,
    has_children       boolean DEFAULT false,
    children_ages      text,
    experience         text,
    motivation         text NOT NULL,
    availability       text,
    shelter_notes      text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX applications_pet_status_idx ON applications (pet_id, status);
CREATE INDEX applications_user_idx ON applications (user_id, created_at DESC);
