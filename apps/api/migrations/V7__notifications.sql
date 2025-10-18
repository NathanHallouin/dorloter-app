-- Notifications persistees (centre de notifications in-app) + tokens push natifs.

CREATE TABLE notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       varchar(32)  NOT NULL CHECK (type IN ('match_found', 'application_update',
                                                     'new_cat_nearby', 'report_nearby', 'new_message')),
    title      varchar(255) NOT NULL,
    body       text,
    data       jsonb,
    is_read    boolean      NOT NULL DEFAULT false,
    created_at timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_read_idx ON notifications (user_id, is_read);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);

CREATE TABLE device_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expo_push_token text        NOT NULL,
    platform        varchar(16) NOT NULL CHECK (platform IN ('ios', 'android')),
    device_name     varchar(255),
    last_seen_at    timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT device_tokens_user_token_key UNIQUE (user_id, expo_push_token)
);

CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);
