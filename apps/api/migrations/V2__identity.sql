-- Identite : utilisateurs, comptes (credentials) et refresh tokens JWT.
--
-- Tables possedees par l'API (schema dorloter_api). Les hashes de mot de passe
-- utilisent le format scrypt de Better Auth ("saltHex:keyHex"), ce qui permet
-- d'importer les comptes existants (INSERT ... SELECT depuis public.*) sans
-- demander de reinitialisation aux utilisateurs.

CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           varchar(255) NOT NULL,
    email_verified  boolean      NOT NULL DEFAULT false,
    name            varchar(255) NOT NULL,
    image           text,
    role            varchar(32)  NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user', 'shelter_admin', 'pension_admin',
                                        'platform_admin')),
    phone           varchar(20),
    shelter_id      uuid,
    pension_id      uuid,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- Unicite de l'email insensible a la casse.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE accounts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    account_id    varchar(255) NOT NULL,
    provider_id   varchar(255) NOT NULL,
    password      text,
    access_token  text,
    refresh_token text,
    id_token      text,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT accounts_provider_account_key UNIQUE (provider_id, account_id)
);

CREATE INDEX accounts_user_idx ON accounts (user_id);

CREATE TABLE auth_refresh_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    user_agent  text,
    ip_address  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_refresh_tokens_hash_key UNIQUE (token_hash)
);

CREATE INDEX auth_refresh_tokens_user_idx ON auth_refresh_tokens (user_id);
