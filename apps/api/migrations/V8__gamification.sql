-- Credits de resolution (gamification). Un credit par (signalement, user, role).
CREATE TABLE resolution_credits (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id  uuid        NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       varchar(20) NOT NULL CHECK (role IN ('author', 'matcher')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resolution_credits_unique UNIQUE (report_id, user_id, role)
);

CREATE INDEX resolution_credits_user_idx ON resolution_credits (user_id);
