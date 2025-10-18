-- Stock et besoins (back-office refuge) : inventaire alimentation, litière,
-- matériel, médical, avec seuil d'alerte.

CREATE TABLE inventory_items (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    name       varchar(200) NOT NULL,
    category   varchar(20) NOT NULL DEFAULT 'autre'
                 CHECK (category IN ('alimentation', 'litiere', 'medical', 'materiel', 'autre')),
    quantity   numeric(10, 2) NOT NULL DEFAULT 0,
    unit       varchar(20),
    threshold  numeric(10, 2),
    notes      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_items_shelter_idx ON inventory_items (shelter_id);
