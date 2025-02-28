// # Dette fil kører database-migrationer
// # Det sikrer, at vores database-tabeller eksisterer og har den korrekte struktur
import { db } from "./index";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// # Kør migrationen for at sikre, at databasen er oprettet korrekt
console.log("Running database migrations...");

try {
  // # Anvend migrationen på vores database
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations completed successfully");
} catch (error) {
  // # Hvis der opstår en fejl, log detaljer
  console.error("Failed to run migrations:", error);
  
  // # Kast fejlen videre
  process.exit(1);
} 