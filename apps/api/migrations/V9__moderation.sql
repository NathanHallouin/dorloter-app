-- Signalements de contenu (moderation a posteriori).
CREATE TABLE content_reports (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id   uuid REFERENCES users (id) ON DELETE SET NULL,
    content_type  varchar(16)  NOT NULL CHECK (content_type IN ('pet', 'report', 'shelter', 'user')),
    content_id    uuid         NOT NULL,
    reason        varchar(100) NOT NULL,
    comment       text,
    status        varchar(16)  NOT NULL DEFAULT 'en_attente'
                      CHECK (status IN ('en_attente', 'masque', 'rejete')),
    resolved_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
    resolved_at   timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX content_reports_status_idx ON content_reports (status);
CREATE INDEX content_reports_content_idx ON content_reports (content_type, content_id);
CREATE INDEX content_reports_reporter_idx ON content_reports (reporter_id);
