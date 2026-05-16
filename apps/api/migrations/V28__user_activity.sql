-- Suivi d'activité des comptes, pour la suppression des comptes inactifs
-- (RGPD art. 5.1.e · limitation de la conservation).
--
-- `updated_at` ne pouvait pas servir de repère : elle bouge à chaque édition
-- de profil, y compris automatique, et n'exprime donc pas l'usage réel.
--
-- `last_seen_at` est rafraîchie aux connexions et aux renouvellements de jeton
-- (au plus une écriture par jour et par compte, cf. IdentityService).
-- `inactivity_notified_at` porte la date de la relance envoyée avant
-- suppression : elle n'est posée que si l'email a réellement été remis, et
-- remise à NULL dès que la personne se reconnecte.

ALTER TABLE users ADD COLUMN last_seen_at timestamptz;
ALTER TABLE users ADD COLUMN inactivity_notified_at timestamptz;

-- Amorçage : les comptes existants sont réputés vus à leur dernière écriture.
-- Sans cela ils seraient tous considérés comme inactifs de longue date.
UPDATE users SET last_seen_at = GREATEST(created_at, updated_at) WHERE last_seen_at IS NULL;

ALTER TABLE users ALTER COLUMN last_seen_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN last_seen_at SET NOT NULL;

-- Le balayage des inactifs filtre sur ces deux colonnes.
CREATE INDEX users_last_seen_at_idx ON users (last_seen_at);
CREATE INDEX users_inactivity_notified_at_idx ON users (inactivity_notified_at)
    WHERE inactivity_notified_at IS NOT NULL;
