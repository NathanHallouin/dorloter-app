-- ─────────────────────────────────────────────────────────────────────────────
-- Rôles PostgreSQL Miaou : defense-in-depth via privilèges DB
--
-- miaou_app    → rôle utilisé par l'application publique (pages, Server Actions
--                non-admin). CRUD sur les tables métier, mais INCAPABLE de :
--                  • escalader un rôle utilisateur (users.role)
--                  • s'auto-assigner à un refuge (users.shelter_id)
--                  • vérifier un refuge (shelters.is_verified)
--                  • résoudre un signalement de modération (content_reports.*)
--
-- miaou_admin  → rôle utilisé par les Server Actions platform_admin
--                (verifyShelter, resolveContentReport, promotions de rôle).
--                Aucune restriction. Connexion séparée via DATABASE_URL_ADMIN.
--
-- Le propriétaire historique reste `miaou` (superuser local). En prod,
-- n'utilisez plus JAMAIS la connexion `miaou` dans l'app.
--
-- Idempotent : peut être ré-exécuté après migrations pour refresh les grants.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── Création des rôles ─────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'miaou_app') THEN
    CREATE ROLE miaou_app LOGIN PASSWORD 'miaou_app';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'miaou_admin') THEN
    CREATE ROLE miaou_admin LOGIN PASSWORD 'miaou_admin';
  END IF;
END
$$;

-- ─── Reset : on révoque tout puis on re-grant proprement ───────────────────

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM miaou_app, miaou_admin;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM miaou_app, miaou_admin;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM miaou_app, miaou_admin;
REVOKE ALL ON SCHEMA public FROM miaou_app, miaou_admin;

GRANT USAGE ON SCHEMA public TO miaou_app, miaou_admin;

-- ─── miaou_admin : accès complet (rôle privilégié) ─────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO miaou_admin;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO miaou_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO miaou_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO miaou_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO miaou_admin;

-- ─── miaou_app : CRUD par défaut, puis restrictions ciblées ────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO miaou_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO miaou_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO miaou_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO miaou_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO miaou_app;

-- ─── Restrictions de colonnes sur miaou_app ────────────────────────────────
-- On révoque l'UPDATE total puis on le re-donne sur les colonnes autorisées.
-- Toute nouvelle colonne ajoutée par une future migration bascule par défaut
-- en "non-updatable" pour miaou_app : ré-exécutez ce script après migration.

-- users : interdit role, shelter_id (escalade de privilège)
REVOKE UPDATE ON TABLE users FROM miaou_app;
GRANT UPDATE (
  email,
  email_verified,
  name,
  image,
  location,
  notification_radius_km,
  push_subscription,
  phone,
  resolved_count,
  updated_at
) ON users TO miaou_app;

-- shelters : interdit is_verified (seul le platform_admin vérifie)
REVOKE UPDATE ON TABLE shelters FROM miaou_app;
GRANT UPDATE (
  name,
  slug,
  description,
  mission_long,
  siret,
  founded_year,
  address,
  location,
  phone,
  email,
  website,
  donation_url,
  visit_hours,
  logo_url,
  cover_url,
  updated_at
) ON shelters TO miaou_app;

-- content_reports : insertion libre (tout user peut signaler), mais la
-- résolution (status, resolved_by_id, resolved_at) est réservée à miaou_admin.
REVOKE UPDATE, DELETE ON TABLE content_reports FROM miaou_app;

-- conversations : pas de colonnes sensibles particulières. On interdit juste
-- la modification des clés d'identité (user_id, shelter_id, cat_id) et du
-- timestamp created_at pour éviter les trucs louches.
REVOKE UPDATE ON TABLE conversations FROM miaou_app;
GRANT UPDATE (
  subject,
  last_message_at,
  last_message_preview,
  last_sender_type,
  user_unread_count,
  shelter_unread_count,
  archived_by_user,
  archived_by_shelter,
  updated_at
) ON conversations TO miaou_app;

-- messages : l'auteur peut éditer son propre contenu (content + edited_at)
-- et le destinataire peut marquer lu (read_at). Pas de modif de sender_*
-- pour éviter l'usurpation.
REVOKE UPDATE ON TABLE messages FROM miaou_app;
GRANT UPDATE (
  content,
  read_at,
  edited_at
) ON messages TO miaou_app;

-- ─── Sécurité des futures migrations ───────────────────────────────────────
-- Les migrations Drizzle tournent avec `miaou` (superuser). Après chaque
-- migration qui ajoute une colonne à users ou shelters, ré-exécutez ce
-- script pour recalculer les grants.

COMMIT;
