-- # Initial migration: Opret alle tabeller
CREATE TABLE hold (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  navn TEXT NOT NULL,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE spillere (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hold_id INTEGER NOT NULL REFERENCES hold(id) ON DELETE CASCADE,
  navn TEXT NOT NULL,
  nummer INTEGER,
  er_mv INTEGER NOT NULL DEFAULT 0,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE traeninger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hold_id INTEGER REFERENCES hold(id) ON DELETE CASCADE,
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  dato INTEGER NOT NULL DEFAULT (unixepoch()),
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch()),
  flere_tilmeldte INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE traening_hold (
  traening_id INTEGER NOT NULL REFERENCES traeninger(id) ON DELETE CASCADE,
  hold_id INTEGER NOT NULL REFERENCES hold(id) ON DELETE CASCADE,
  tilmeldt_dato INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (traening_id, hold_id)
);

CREATE TABLE traening_deltager (
  traening_id INTEGER NOT NULL REFERENCES traeninger(id) ON DELETE CASCADE,
  spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
  tilstede INTEGER NOT NULL DEFAULT 1,
  registreret_dato INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (traening_id, spiller_id)
);

CREATE TABLE offensive_positioner (
  spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  er_primaer INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (spiller_id, position)
);

CREATE TABLE defensive_positioner (
  spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  er_primaer INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (spiller_id, position)
);

CREATE TABLE kategorier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  navn TEXT NOT NULL UNIQUE,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE fokuspunkter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tekst TEXT NOT NULL UNIQUE,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE oevelser (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  billede_sti TEXT,
  bruger_positioner INTEGER NOT NULL DEFAULT 0,
  minimum_deltagere INTEGER,
  kategori_id INTEGER REFERENCES kategorier(id),
  original_positioner_navn TEXT,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE oevelse_variationer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
  navn TEXT NOT NULL,
  beskrivelse TEXT,
  oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE oevelse_positioner (
  oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
  variation_id INTEGER REFERENCES oevelse_variationer(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  antal_kraevet INTEGER NOT NULL DEFAULT 0,
  er_offensiv INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (oevelse_id, variation_id, position)
);

CREATE TABLE oevelse_fokuspunkter (
  oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
  fokuspunkt_id INTEGER NOT NULL REFERENCES fokuspunkter(id) ON DELETE CASCADE,
  PRIMARY KEY (oevelse_id, fokuspunkt_id)
); 