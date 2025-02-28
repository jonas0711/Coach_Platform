// # Dette fil konfigurerer drizzle-kit til at generere migrationer

import type { Config } from "drizzle-kit";
import { join } from "path";

export default {
  // # Drizzle vil lede efter skemaer i disse stier
  schema: "./lib/db/schema.ts",
  
  // # Drizzle vil gemme migrations i denne sti
  out: "./drizzle",
  
  // # SQLite-databasen ligge i roden af projektet
  dialect: "sqlite",
  dbCredentials: {
    url: join(process.cwd(), "coach-platform.db"),
  },
} satisfies Config; 