-- Seed de développement Dorloter (idempotent · ON CONFLICT DO NOTHING).
-- Recrée les comptes de docs/COMPTES-TEST.md sur une base fraîche.
-- Mot de passe commun : motdepasse12 (hash scrypt Better Auth réutilisé).
--   bun db:seed   (ou psql ... -f scripts/seed.sql)

SET search_path TO dorloter_api, public;

\set pwd 'cb4b031db0c57bcb78e6cd54cdec2e15:6141ce0f504e4180a8e465b1e896e00bef093d8c69270022a3868ac075e284324cae8ed67e5790b4d35ae69dca4ff2b4e05f67b2110c19f590e2e3eb973543eb'

BEGIN;

-- ─── Structures pro ──────────────────────────────────────────────────────────
INSERT INTO shelters (id, name, slug, description, siret, address, phone, email, is_verified, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Refuge des Quatre Pattes', 'refuge-des-quatre-pattes',
        'Refuge associatif lyonnais accueillant chats et chiens.', '12345678900012',
        '12 rue des Tilleuls, 69007 Lyon', '0478000000', 'contact@quatre-pattes.fr', true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pensions (id, name, slug, description, siret, address, phone, email, accepts_cats, accepts_dogs,
        capacity_cats, capacity_dogs, price_per_day_cat, price_per_day_dog, is_verified, is_demo, created_at, updated_at)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Les Coussinets Dorés', 'les-coussinets-dores',
        'Pension féline et canine agréée, à la campagne.', '98765432100018',
        '4 chemin du Pré, 69380 Lozanne', '0472000000', 'contact@coussinets-dores.fr',
        true, true, 6, 4, 22.00, 28.00, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── Utilisateurs ────────────────────────────────────────────────────────────
-- Équipe refuge : rôle GLOBAL = user, permissions via shelter_members.
INSERT INTO users (id, email, email_verified, name, role, pension_id, is_public, created_at, updated_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'camille.roussel@dorloter.fr', true, 'Camille Roussel', 'user',        NULL, false, now(), now()),
  ('d0000000-0000-0000-0000-000000000002', 'thomas.girard@dorloter.fr',   true, 'Thomas Girard',   'user',        NULL, false, now(), now()),
  ('d0000000-0000-0000-0000-000000000003', 'sarah.lefevre@dorloter.fr',   true, 'Sarah Lefèvre',   'user',        NULL, false, now(), now()),
  ('d0000000-0000-0000-0000-000000000004', 'lea.marchand@dorloter.fr',    true, 'Léa Marchand',    'user',        NULL, true,  now(), now()),
  ('d0000000-0000-0000-0000-000000000005', 'julien.moreau@dorloter.fr',   true, 'Julien Moreau',   'pension_admin', 'b0000000-0000-0000-0000-000000000001', false, now(), now()),
  ('d0000000-0000-0000-0000-000000000007', 'admin@dorloter.fr',           true, 'Admin Dorloter',  'platform_admin', NULL, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Comptes Better Auth (credential) : même hash scrypt pour motdepasse12.
INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'credential', :'pwd', now(), now()
FROM users u
WHERE u.email IN ('camille.roussel@dorloter.fr','thomas.girard@dorloter.fr','sarah.lefevre@dorloter.fr',
                  'lea.marchand@dorloter.fr','julien.moreau@dorloter.fr','admin@dorloter.fr')
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id AND a.provider_id = 'credential');

-- ─── Équipe du refuge (shelter_members) ──────────────────────────────────────
INSERT INTO shelter_members (id, shelter_id, user_id, role, status, created_at, updated_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'owner',        'active', now(), now()),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'gestionnaire', 'active', now(), now()),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'benevole',     'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── Animaux du refuge ───────────────────────────────────────────────────────
INSERT INTO pets (id, shelter_id, species, name, description, breed, color, sex, age_category,
        is_sterilized, is_chipped, is_vaccinated, ok_with_cats, ok_with_dogs, ok_with_children,
        status, adoption_fee, created_at, updated_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'chat', 'Minette',
   'Chatte câline qui adore les genoux.', 'Européen', 'Tigré', 'femelle', 'adulte',
   true, true, true, 'oui', 'inconnu', 'oui', 'disponible', 120.00, now(), now()),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'chien', 'Rex',
   'Jeune chien joueur et sociable.', 'Croisé', 'Fauve', 'male', 'jeune',
   true, true, true, 'inconnu', 'oui', 'oui', 'disponible', 180.00, now(), now()),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'chat', 'Filou',
   'Chat indépendant mais affectueux.', 'Européen', 'Noir et blanc', 'male', 'adulte',
   false, true, true, 'oui', 'non', 'inconnu', 'disponible', 100.00, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── Famille d'accueil + candidature acceptée (de quoi générer des contrats) ──
INSERT INTO users (id, email, email_verified, name, role, is_public, created_at, updated_at) VALUES
  ('d0000000-0000-0000-0000-000000000008', 'marie.lambert@dorloter.fr', true, 'Marie Lambert', 'user', false, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'credential', :'pwd', now(), now()
FROM users u
WHERE u.email = 'marie.lambert@dorloter.fr'
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id AND a.provider_id = 'credential');

INSERT INTO foster_families (id, shelter_id, user_id, source, status, city, capacity, accepts_cats, accepts_dogs, created_at, updated_at) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008',
   'shelter', 'active', 'Lyon', 2, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO applications (id, pet_id, user_id, status, motivation, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004',
   'acceptee', 'Famille avec jardin, présente en journée. Coup de cœur pour Minette.', now(), now())
ON CONFLICT (id) DO NOTHING;

COMMIT;

\echo 'Seed appliqué. Comptes (mot de passe motdepasse12) :'
\echo '  camille.roussel@dorloter.fr  (refuge · owner)'
\echo '  julien.moreau@dorloter.fr    (pension_admin)'
\echo '  admin@dorloter.fr            (platform_admin)'
