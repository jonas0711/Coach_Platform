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
console.log("Databaseforbindelse etableret");

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
  )`,
  
  // Opret spillerpositioner-tabellen uden primærnøgle først
  `CREATE TABLE IF NOT EXISTS traening_oevelse_spiller_positioner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traening_oevelse_id INTEGER NOT NULL REFERENCES traening_oevelser(id) ON DELETE CASCADE,
    spiller_id INTEGER NOT NULL REFERENCES spillere(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    er_offensiv INTEGER NOT NULL DEFAULT 1,
    variation_id INTEGER REFERENCES oevelse_variationer(id) ON DELETE CASCADE,
    tilfojet_dato INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  
  // Tilføj et unikt indeks for at sikre unikke kombinationer
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_traening_oevelse_spiller_positioner_unique 
   ON traening_oevelse_spiller_positioner(traening_oevelse_id, spiller_id, position, variation_id)`
];

// # Kør hvert SQL statement for at oprette tabellerne
console.log("Opretter manglende tabeller...");
for (const statement of statements) {
  try {
    console.log(`Forsøger at eksekvere SQL statement: ${statement.slice(0, 60)}...`);
    db.exec(statement);
    console.log("✓ Tabel oprettet eller eksisterede allerede");
  } catch (error) {
    console.error(`❌ Fejl ved oprettelse af tabel: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    console.error(statement);
  }
}

// # Verificer at tabellerne findes
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Eksisterende tabeller i databasen:");
  tables.forEach(table => console.log(`- ${table.name}`));
  
  // Tjek specifikt for vores nye tabel
  const newTableExists = tables.some(table => table.name === 'traening_oevelse_spiller_positioner');
  console.log(`Tabellen 'traening_oevelse_spiller_positioner' ${newTableExists ? 'findes' : 'findes IKKE'} i databasen`);
  
  // Tjek om indekset findes
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='traening_oevelse_spiller_positioner'").all();
  console.log("Indekser for traening_oevelse_spiller_positioner:");
  indexes.forEach(index => console.log(`- ${index.name}`));
} catch (error) {
  console.error(`Fejl ved verifikation af tabeller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
}

console.log("Tabeller oprettet eller opdateret!");

// # Luk databaseforbindelsen
db.close();
console.log("Databaseforbindelse lukket"); 