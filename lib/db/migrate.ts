// # Dette fil kører database-migrationer
// # Det sikrer, at vores database-tabeller eksisterer og har den korrekte struktur
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./migrations/0001_initial";

// # Log database sti
const dbPath = "./coach-platform.db";
console.log("Database path:", dbPath);

try {
  // # Opret forbindelse til databasen
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  console.log("Database connection established successfully");

  // # Kør migrationen for at sikre, at databasen er oprettet korrekt
  console.log("Running database migrations...");

  // # Opret alle tabeller
  const statements = [
    `CREATE TABLE IF NOT EXISTS hold (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      navn TEXT NOT NULL,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS spillere (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hold_id INTEGER NOT NULL REFERENCES hold(id) ON DELETE CASCADE,
      navn TEXT NOT NULL,
      nummer INTEGER,
      er_mv INTEGER NOT NULL DEFAULT 0,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS traeninger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hold_id INTEGER REFERENCES hold(id) ON DELETE CASCADE,
      navn TEXT NOT NULL,
      beskrivelse TEXT,
      dato INTEGER NOT NULL DEFAULT (unixepoch()),
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch()),
      flere_tilmeldte INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS traening_hold (
      traening_id INTEGER NOT NULL REFERENCES traeninger(id) ON DELETE CASCADE,
      hold_id INTEGER NOT NULL REFERENCES hold(id) ON DELETE CASCADE,
      tilmeldt_dato INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (traening_id, hold_id)
    )`,
    `CREATE TABLE IF NOT EXISTS traening_deltager (
      traening_id INTEGER NOT NULL REFERENCES traeninger(id) ON DELETE CASCADE,
      spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
      tilstede INTEGER NOT NULL DEFAULT 1,
      registreret_dato INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (traening_id, spiller_id)
    )`,
    `CREATE TABLE IF NOT EXISTS offensive_positioner (
      spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
      position TEXT NOT NULL,
      er_primaer INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (spiller_id, position)
    )`,
    `CREATE TABLE IF NOT EXISTS defensive_positioner (
      spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
      position TEXT NOT NULL,
      er_primaer INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (spiller_id, position)
    )`,
    `CREATE TABLE IF NOT EXISTS kategorier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      navn TEXT NOT NULL UNIQUE,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS fokuspunkter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tekst TEXT NOT NULL UNIQUE,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS oevelser (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      navn TEXT NOT NULL,
      beskrivelse TEXT,
      billede_sti TEXT,
      bruger_positioner INTEGER NOT NULL DEFAULT 0,
      minimum_deltagere INTEGER,
      kategori_id INTEGER REFERENCES kategorier(id),
      original_positioner_navn TEXT,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS oevelse_variationer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
      navn TEXT NOT NULL,
      beskrivelse TEXT,
      oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS oevelse_positioner (
      oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
      variation_id INTEGER REFERENCES oevelse_variationer(id) ON DELETE CASCADE,
      position TEXT NOT NULL,
      antal_kraevet INTEGER NOT NULL DEFAULT 0,
      er_offensiv INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (oevelse_id, variation_id, position)
    )`,
    `CREATE TABLE IF NOT EXISTS oevelse_fokuspunkter (
      oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
      fokuspunkt_id INTEGER NOT NULL REFERENCES fokuspunkter(id) ON DELETE CASCADE,
      PRIMARY KEY (oevelse_id, fokuspunkt_id)
    )`
  ];

  // # Kør hvert SQL statement enkeltvis
  for (const statement of statements) {
    sqlite.exec(statement);
  }

  console.log("Database migrations completed successfully");
} catch (error) {
  // # Hvis der opstår en fejl, log detaljer
  console.error("Failed to run migrations:", error);
  
  // # Kast fejlen videre
  process.exit(1);
} 