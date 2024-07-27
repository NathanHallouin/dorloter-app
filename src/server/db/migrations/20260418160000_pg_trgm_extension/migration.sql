-- Active l'extension pg_trgm pour la détection de doublons via similarity().
-- Nécessaire pour createReport qui compare les descriptions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
