// # Dette script opretter manuelt de manglende tabeller

const Database = require('better-sqlite3');
const path = require('path');

// # Find stien til databasefilen ud fra rodmappen
const dbPath = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_PATH || path.join(process.cwd(), "coach-platform.db")
  : path.join(process.cwd(), "coach-platform.db");

// # Udskriv stien til databasen
console.log(`Database path: ${dbPath}`);

// # Opret forbindelse til databasen
const db = new Database(dbPath);

// # SQL statements for at oprette de manglende tabeller
const statements = [
  `CREATE TABLE IF NOT EXISTS traening_oevelse_detaljer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traening_oevelse_id INTEGER NOT NULL REFERENCES traening_oevelser(id) ON DELETE CASCADE,
    navn TEXT,
    beskrivelse TEXT,
    kategori_navn TEXT,
    sidst_opdateret INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  
  `CREATE TABLE IF NOT EXISTS traening_oevelse_fokuspunkter (
    traening_oevelse_id INTEGER NOT NULL REFERENCES traening_oevelser(id) ON DELETE CASCADE,
    fokuspunkt_id INTEGER NOT NULL REFERENCES fokuspunkter(id) ON DELETE CASCADE,
    PRIMARY KEY (traening_oevelse_id, fokuspunkt_id)
  )`
];

// # Kør hvert SQL statement for at oprette tabellerne
console.log("Opretter manglende tabeller...");
for (const statement of statements) {
  try {
    db.exec(statement);
    console.log("Tabel oprettet med følgende SQL:");
    console.log(statement);
  } catch (error) {
    console.error(`Fejl ved oprettelse af tabel: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    console.error(statement);
  }
}

console.log("Tabeller oprettet eller eksisterede allerede!");

// # Luk databaseforbindelsen
db.close(); 