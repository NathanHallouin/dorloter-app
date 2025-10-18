-- Demandes de reservation de pension (contact direct, sans paiement en MVP).
-- Un utilisateur demande a faire garder son animal sur une periode ; la pension
-- traite la demande (envoyee -> confirmee/refusee). L'utilisateur peut annuler.

CREATE TABLE pension_bookings (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pension_id   uuid     NOT NULL REFERENCES pensions (id) ON DELETE CASCADE,
    user_id      uuid     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pet_name     varchar(255),
    species      varchar(10) NOT NULL CHECK (species IN ('chat', 'chien')),
    start_date   date     NOT NULL,
    end_date     date     NOT NULL,
    nights       integer  NOT NULL CHECK (nights >= 1),
    total_price  numeric(8, 2),
    notes        text,
    status       varchar(20) NOT NULL DEFAULT 'envoyee'
                 CHECK (status IN ('envoyee', 'confirmee', 'refusee', 'annulee')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pension_bookings_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX pension_bookings_user_idx ON pension_bookings (user_id, created_at DESC);
CREATE INDEX pension_bookings_pension_idx ON pension_bookings (pension_id, status);
