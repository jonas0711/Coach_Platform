// # Dette scripts opretter indekser på databasen for at forbedre ydeevnen
// # Det skal køres efter at databaseskemaet er oprettet

import { db } from "./index";

/**
 * # Opret indekser på databasen
 * # Denne funktion opretter indekser på de tabeller, der bruges hyppigt i forespørgsler
 * # for at forbedre ydeevnen af databaseforespørgsler
 */
export async function createIndices() {
  console.log("Opretter indekser på databasen...");
  
  try {
    // # Opret indeks på traeningHold-tabellen for hurtigere joins
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traening_hold_traening_id 
      ON traening_hold (traening_id);
    `);
    console.log("Indeks oprettet: idx_traening_hold_traening_id");
    
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traening_hold_hold_id 
      ON traening_hold (hold_id);
    `);
    console.log("Indeks oprettet: idx_traening_hold_hold_id");
    
    // # Opret indeks på spillere-tabellen for hurtigere joins
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_spillere_hold_id 
      ON spillere (hold_id);
    `);
    console.log("Indeks oprettet: idx_spillere_hold_id");
    
    // # Opret indeks på traeningDeltager-tabellen for hurtigere lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traening_deltager_traening_id 
      ON traening_deltager (traening_id);
    `);
    console.log("Indeks oprettet: idx_traening_deltager_traening_id");
    
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traening_deltager_spiller_id 
      ON traening_deltager (spiller_id);
    `);
    console.log("Indeks oprettet: idx_traening_deltager_spiller_id");
    
    // # Opret indeks på dato-feltet i traeninger for hurtigere sorteringer
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traeninger_dato 
      ON traeninger (dato DESC);
    `);
    console.log("Indeks oprettet: idx_traeninger_dato");
    
    // # Opret indeks på flereTilmeldte for hurtigere filtrering
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_traeninger_flere_tilmeldte 
      ON traeninger (flere_tilmeldte);
    `);
    console.log("Indeks oprettet: idx_traeninger_flere_tilmeldte");
    
    console.log("Alle indekser er oprettet korrekt!");
    return true;
  } catch (error) {
    console.error("Fejl ved oprettelse af indekser:", error);
    return false;
  }
} 