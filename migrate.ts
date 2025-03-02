// # Migration script til at opdatere databasestruktur
import { db } from './lib/db';
import * as schema from './lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Starter databasemigration...');

  try {
    // # Opret kategorier tabellen
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS kategorier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        navn TEXT NOT NULL UNIQUE,
        oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    console.log('Oprettet kategorier tabel');

    // # Opret fokuspunkter tabellen
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS fokuspunkter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tekst TEXT NOT NULL UNIQUE,
        oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    console.log('Oprettet fokuspunkter tabel');

    // # Opret oevelser tabellen
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS oevelser (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        navn TEXT NOT NULL,
        beskrivelse TEXT,
        billede_sti TEXT,
        bruger_positioner INTEGER NOT NULL DEFAULT 0,
        minimum_deltagere INTEGER,
        oprettet_dato INTEGER NOT NULL DEFAULT (unixepoch()),
        kategori_id INTEGER REFERENCES kategorier(id)
      );
    `);
    console.log('Oprettet oevelser tabel');

    // # Opret oevelse_positioner tabellen
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS oevelse_positioner (
        oevelse_id INTEGER NOT NULL,
        position TEXT NOT NULL,
        antal_kraevet INTEGER NOT NULL DEFAULT 0,
        er_offensiv INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (oevelse_id, position),
        FOREIGN KEY (oevelse_id) REFERENCES oevelser (id) ON DELETE CASCADE
      );
    `);
    console.log('Oprettet oevelse_positioner tabel');

    // # Opret oevelse_fokuspunkter tabellen (mange-til-mange relation)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS oevelse_fokuspunkter (
        oevelse_id INTEGER NOT NULL,
        fokuspunkt_id INTEGER NOT NULL,
        PRIMARY KEY (oevelse_id, fokuspunkt_id),
        FOREIGN KEY (oevelse_id) REFERENCES oevelser (id) ON DELETE CASCADE,
        FOREIGN KEY (fokuspunkt_id) REFERENCES fokuspunkter (id) ON DELETE CASCADE
      );
    `);
    console.log('Oprettet oevelse_fokuspunkter tabel');

    console.log('Migration fuldført succesfuldt!');
  } catch (error) {
    console.error('Fejl under migration:', error);
    process.exit(1);
  }
}

main(); 