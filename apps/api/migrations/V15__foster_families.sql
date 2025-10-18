-- Familles d'accueil d'un refuge + placements d'animaux (back-office refuge).

CREATE TABLE foster_families (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id   uuid        NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    name         varchar(255) NOT NULL,
    email        varchar(255),
    phone        varchar(40),
    city         varchar(255),
    capacity     integer     NOT NULL DEFAULT 1,
    accepts_cats boolean     NOT NULL DEFAULT true,
    accepts_dogs boolean     NOT NULL DEFAULT true,
    notes        text,
    status       varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX foster_families_shelter_idx ON foster_families (shelter_id);

CREATE TABLE foster_placements (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    foster_family_id uuid NOT NULL REFERENCES foster_families (id) ON DELETE CASCADE,
    pet_id           uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
    started_at       date NOT NULL DEFAULT current_date,
    ended_at         date,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX foster_placements_family_idx ON foster_placements (foster_family_id);
CREATE INDEX foster_placements_pet_idx ON foster_placements (pet_id);

-- Un animal ne peut etre place que dans une seule famille a la fois (placement en cours).
CREATE UNIQUE INDEX foster_placements_active_pet_idx
    ON foster_placements (pet_id) WHERE ended_at IS NULL;
