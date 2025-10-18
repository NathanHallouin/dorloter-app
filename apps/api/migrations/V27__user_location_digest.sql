-- Géolocalisation de l'utilisateur + préférences de digest « Nouveautés dans
-- votre rayon » (feature 5.2). L'utilisateur pose un point sur la carte depuis
-- son profil ; le digest suggère les animaux à adopter récemment publiés dans
-- son rayon. `digest_optin` : réception du digest (in-app), activé par défaut.

ALTER TABLE users ADD COLUMN location public.geometry(Point, 4326);
ALTER TABLE users ADD COLUMN notification_radius_km integer NOT NULL DEFAULT 25;
ALTER TABLE users ADD COLUMN digest_optin boolean NOT NULL DEFAULT true;

CREATE INDEX users_location_idx ON users USING gist (location);
