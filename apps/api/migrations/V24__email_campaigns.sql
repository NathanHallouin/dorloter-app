-- Communication : campagnes email (newsletter) envoyées par un refuge.

CREATE TABLE email_campaigns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id      uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    subject         varchar(255) NOT NULL,
    body            text NOT NULL,
    audience        varchar(20) NOT NULL CHECK (audience IN ('benevoles', 'abonnes', 'tous')),
    recipient_count integer NOT NULL DEFAULT 0,
    sent_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_campaigns_shelter_idx ON email_campaigns (shelter_id, created_at DESC);
