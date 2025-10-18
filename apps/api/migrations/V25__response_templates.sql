-- Bibliothèque de modèles de réponses aux candidatures (back-office refuge).
-- Textes pré-rédigés par catégorie, avec variables auto-remplies côté client :
-- {{prenomCandidat}}, {{nomAnimal}}, {{nomRefuge}}. Utilisés dans le flux
-- accepter/refuser une candidature (composition d'un email de réponse).

CREATE TABLE response_templates (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_id uuid NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    category   varchar(20) NOT NULL DEFAULT 'generique'
                 CHECK (category IN ('acceptation', 'refus', 'infos', 'rdv', 'generique')),
    name       varchar(120) NOT NULL,
    subject    varchar(255),
    body       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX response_templates_shelter_idx ON response_templates (shelter_id, category);
