-- Equipe d'un refuge : plusieurs comptes membres, avec un role par refuge.
-- Remplace le lien 1:1 users.shelter_id (conserve pour compat) par une appartenance N:N.

CREATE TABLE shelter_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id  uuid        NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        varchar(20) NOT NULL CHECK (role IN ('owner', 'gestionnaire', 'benevole')),
    status      varchar(20) NOT NULL DEFAULT 'active',
    invited_by  uuid        REFERENCES users (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT shelter_members_unique UNIQUE (shelter_id, user_id)
);

CREATE INDEX shelter_members_user_idx ON shelter_members (user_id);
CREATE INDEX shelter_members_shelter_idx ON shelter_members (shelter_id);

-- Backfill : chaque shelter_admin actuel devient owner de son refuge.
INSERT INTO shelter_members (shelter_id, user_id, role)
SELECT shelter_id, id, 'owner'
FROM users
WHERE role = 'shelter_admin' AND shelter_id IS NOT NULL
ON CONFLICT (shelter_id, user_id) DO NOTHING;
