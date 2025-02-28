// # Dette fil opsætter forbindelsen til SQLite-databasen
// # Den eksporterer en database-klient, der kan bruges i hele applikationen
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join } from "path";
import { homedir } from "os";

// # Opret databasemappen i brugerens hjemmemappe, hvis den ikke eksisterer
const dbPath = join(process.cwd(), "coach-platform.db");

// # Printstatement til at vise databasestien ved opstart
console.log(`Database path: ${dbPath}`);

// # Opret SQLite-databaseforbindelse
// # Med bedre fejlhåndtering, men stadig direkte
let sqlite: Database.Database;

try {
  // # Forsøg at oprette databaseforbindelsen
  sqlite = new Database(dbPath);
  
  // # Log succesbesked
  console.log("Database connection established successfully");
} catch (error) {
  // # Hvis der opstår en fejl, log detaljer
  console.error("Failed to connect to database:", error);
  
  // # Kast fejlen videre, så vi undgår at fortsætte med en ugyldig forbindelse
  throw new Error(`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
}

// # Opret drizzle-klienten med vores schema
export const db = drizzle(sqlite, { schema });

// # Eksporter databaseskemaet for nem adgang
export * from "./schema"; 