-- # Migration: Tilføj ratings til spillere tabellen
-- # Beskrivelse: Tilføjer offensiv_rating og defensiv_rating kolonner til spillere tabellen

-- # Tilføj offensiv_rating kolonne
ALTER TABLE spillere ADD COLUMN offensiv_rating INTEGER;

-- # Tilføj defensiv_rating kolonne
ALTER TABLE spillere ADD COLUMN defensiv_rating INTEGER; 