-- Le refuge peut activer la reception de demandes spontanees de familles d'accueil.
ALTER TABLE shelters ADD COLUMN accepts_foster_applications boolean NOT NULL DEFAULT false;
