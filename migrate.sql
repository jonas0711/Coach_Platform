-- Opret tabel for øvelsesvariationer
CREATE TABLE IF NOT EXISTS oevelse_variationer (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  oevelse_id INTEGER NOT NULL,
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (oevelse_id) REFERENCES oevelser(id) ON DELETE CASCADE
);

-- Drop den eksisterende oevelse_positioner tabel
DROP TABLE IF EXISTS oevelse_positioner;

-- Opret den nye oevelse_positioner tabel med variation_id
CREATE TABLE oevelse_positioner (
  oevelse_id INTEGER NOT NULL,
  variation_id INTEGER,
  position TEXT NOT NULL,
  antal_kraevet INTEGER DEFAULT 0 NOT NULL,
  er_offensiv INTEGER DEFAULT 1 NOT NULL,
  PRIMARY KEY(oevelse_id, variation_id, position),
  FOREIGN KEY (oevelse_id) REFERENCES oevelser(id) ON DELETE CASCADE,
  FOREIGN KEY (variation_id) REFERENCES oevelse_variationer(id) ON DELETE CASCADE
); 