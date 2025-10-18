-- Champs de profil public : courte bio, ville, et visibilite publique du profil.
ALTER TABLE users ADD COLUMN bio text;
ALTER TABLE users ADD COLUMN city varchar(255);
ALTER TABLE users ADD COLUMN is_public boolean NOT NULL DEFAULT false;
