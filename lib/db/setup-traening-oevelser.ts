'use server';

import { db } from "./index";
import fs from 'fs';
import path from 'path';
import { sql } from "drizzle-orm";

// # Funktion til at oprette traening_oevelser tabellen hvis den ikke eksisterer
export async function setupTraeningOevelserTable() {
  try {
    // # SQL til at oprette tabellen
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS traening_oevelser (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        traening_id INTEGER NOT NULL REFERENCES traeninger(id) ON DELETE CASCADE,
        oevelse_id INTEGER NOT NULL REFERENCES oevelser(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        tilfojet_dato INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `;
    
    // # Udfør SQL kommandoen
    await db.run(sql.raw(createTableSQL));
    
    console.log("Tabellen traening_oevelser er nu oprettet eller eksisterede allerede");
    return { success: true, message: "Tabellen traening_oevelser er nu oprettet eller eksisterede allerede" };
  } catch (error) {
    console.error("Fejl ved oprettelse af traening_oevelser tabel:", error);
    return { success: false, message: `Fejl ved oprettelse af tabel: ${error instanceof Error ? error.message : 'Ukendt fejl'}` };
  }
} 