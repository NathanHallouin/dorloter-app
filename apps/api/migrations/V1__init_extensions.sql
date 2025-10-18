-- Baseline du schema gere par Flyway pour l'API Java.
--
-- L'API Dorloter (Spring Boot) possede son propre schema `dorloter_api` sur la
-- meme base PostgreSQL que le front Next.js. PostGIS est installe dans le schema
-- `public`, partage : le type `geometry` et les fonctions ST_* y restent
-- accessibles via le search_path (dorloter_api, public).
--
-- Les tables metier sont creees par les migrations suivantes (V2+), une par
-- phase de migration des domaines.

CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
