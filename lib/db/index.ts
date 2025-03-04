// # Dette fil opsætter forbindelsen til SQLite-databasen
// # Den eksporterer en database-klient, der kan bruges i hele applikationen
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join } from "path";
import { homedir } from "os";

// # Opret databasemappen i brugerens hjemmemappe, hvis den ikke eksisterer
const dbPath = join(process.cwd(), "coach-platform.db");

// # Singleton-mønster for databaseforbindelsen
// # Dette sikrer at vi kun opretter én forbindelse gennem applikationens levetid
let sqlite: Database.Database | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// # Funktion til at få databaseforbindelsen
function getDb() {
  // # Hvis databaseforbindelsen allerede eksisterer, genbrug den
  if (dbInstance) {
    return dbInstance;
  }

  // # Printstatement til at vise databasestien kun ved første oprettelse
  console.log(`Database path: ${dbPath}`);

  try {
    // # Forsøg at oprette databaseforbindelsen, hvis den ikke allerede eksisterer
    if (!sqlite) {
      sqlite = new Database(dbPath);
      console.log("Database connection established successfully");
    }
    
    // # Opret drizzle-klienten med vores schema
    dbInstance = drizzle(sqlite, { schema });
    
    return dbInstance;
  } catch (error) {
    // # Hvis der opstår en fejl, log detaljer
    console.error("Failed to connect to database:", error);
    
    // # Kast fejlen videre, så vi undgår at fortsætte med en ugyldig forbindelse
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// # Eksporter db som en funktion, der returnerer databasen
export const db = getDb();

// # Eksporter databaseskemaet for nem adgang
export * from "./schema";
export * from "./actions"; 