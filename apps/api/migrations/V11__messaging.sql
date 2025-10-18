-- Messagerie user <-> refuge (polling). Reactions et temps reel SSE hors perimetre.

CREATE TABLE conversations (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    shelter_id           uuid        NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    pet_id               uuid        REFERENCES pets (id) ON DELETE SET NULL,
    subject              varchar(255),
    last_message_at      timestamptz NOT NULL DEFAULT now(),
    last_message_preview varchar(200),
    last_sender_type     varchar(20),
    user_unread_count    integer     NOT NULL DEFAULT 0,
    shelter_unread_count integer     NOT NULL DEFAULT 0,
    archived_by_user     boolean     NOT NULL DEFAULT false,
    archived_by_shelter  boolean     NOT NULL DEFAULT false,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Une seule conversation par contexte (user, refuge, animal). NULL animal
-- ramene a un UUID sentinelle pour que NULL ne contourne pas l'unicite.
CREATE UNIQUE INDEX conversations_context_idx ON conversations
    (user_id, shelter_id, COALESCE(pet_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX conversations_user_idx ON conversations (user_id, last_message_at DESC);
CREATE INDEX conversations_shelter_idx ON conversations (shelter_id, last_message_at DESC);

CREATE TABLE messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_type     varchar(20) NOT NULL CHECK (sender_type IN ('user', 'shelter')),
    sender_id       uuid        REFERENCES users (id) ON DELETE SET NULL,
    content         text,
    attachment_type varchar(20),
    attachment_url  text,
    attachment_meta jsonb,
    read_at         timestamptz,
    edited_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);
