-- Les familles d'accueil deviennent de vrais comptes utilisateurs, avec un
-- cycle de vie : invitation (du refuge) ou demande (de l'utilisateur) -> active.
-- Données de démo V15 (texte libre) supprimées : changement de modèle.

DELETE FROM foster_placements;
DELETE FROM foster_families;

ALTER TABLE foster_families
    DROP COLUMN name,
    DROP COLUMN email,
    DROP COLUMN phone,
    ADD COLUMN user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    ADD COLUMN source  varchar(20) NOT NULL DEFAULT 'shelter';

ALTER TABLE foster_families DROP CONSTRAINT IF EXISTS foster_families_status_check;
ALTER TABLE foster_families ADD CONSTRAINT foster_families_status_check
    CHECK (status IN ('invited', 'requested', 'active', 'declined', 'ended'));

-- Une seule relation par (refuge, utilisateur).
CREATE UNIQUE INDEX foster_families_user_shelter_idx ON foster_families (shelter_id, user_id);
CREATE INDEX foster_families_user_idx ON foster_families (user_id);
