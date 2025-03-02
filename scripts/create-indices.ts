// # Script til at køre createIndices-funktionen
// # Dette script opretter indekser på databasen for at forbedre ydeevnen
// # Kør med: npx tsx scripts/create-indices.ts

import { createIndices } from "../lib/db/indexer";

async function main() {
  console.log("Starter oprettelse af indekser...");
  
  try {
    const success = await createIndices();
    
    if (success) {
      console.log("Indekser oprettet korrekt!");
      process.exit(0);
    } else {
      console.error("Kunne ikke oprette indekser!");
      process.exit(1);
    }
  } catch (error) {
    console.error("En uventet fejl opstod:", error);
    process.exit(1);
  }
}

main(); 