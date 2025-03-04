// # Dette fil kører database-migrationer
// # Det sikrer, at vores database-tabeller eksisterer og har den korrekte struktur
const { drizzle } = require("drizzle-orm/better-sqlite3");
const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
const Database = require("better-sqlite3");
const path = require("path");

// # Find stien til databasefilen ud fra rodmappen
const dbPath = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_PATH || path.join(process.cwd(), "coach-platform.db")
  : path.join(process.cwd(), "coach-platform.db");

// # Udskriv stien til databasen (nyttigt ved fejlfinding)
console.log(`Database path: ${dbPath}`);

// # Opret SQLite databaseforbindelse
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// # Kør migrations fra migrationsmappen
console.log("Kører database migrationer...");
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
console.log("Database migrationer er gennemført!");

// # Luk databaseforbindelsen
sqlite.close(); 