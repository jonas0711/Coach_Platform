// # Dette fil definerer databaseskemaet for vores trænerplatform
// # Vi bruger Drizzle ORM til at definere tabeller og relationer
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// # Tabel for hold
// # Indeholder basale oplysninger om et håndboldhold
export const hold = sqliteTable("hold", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull(), // # Holdets navn er påkrævet
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),  // # Automatisk tidsstempel for oprettelse
});

// # Tabel for spillere
// # Indeholder oplysninger om hver spiller og deres tilknytning til et hold
export const spillere = sqliteTable("spillere", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holdId: integer("hold_id").notNull().references(() => hold.id, { onDelete: "cascade" }), // # Relation til et hold
  navn: text("navn").notNull(), // # Spillerens navn er påkrævet
  nummer: integer("nummer"), // # Spillerens nummer er valgfrit
  erMV: integer("er_mv", { mode: "boolean" }).notNull().default(false), // # Om spilleren er målvogter
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
});

// # Offensive positioner for en spiller
// # En spiller kan have flere offensive positioner, hvoraf én kan være primær
export const offensivePositioner = sqliteTable(
  "offensive_positioner",
  {
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }), // # Relation til spilleren
    position: text("position").notNull(), // # Positionens navn (VF, VB, PM, HB, HF, ST)
    erPrimaer: integer("er_primaer", { mode: "boolean" }).notNull().default(false), // # Om positionen er primær
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.spillerId, table.position] }), // # Primærnøgle er kombinationen af spiller-id og position
    };
  }
);

// # Defensive positioner for en spiller
// # En spiller kan have flere defensive positioner, hvoraf to kan være primære
export const defensivePositioner = sqliteTable(
  "defensive_positioner",
  {
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }), // # Relation til spilleren
    position: text("position").notNull(), // # Positionens navn (1, 2, 3, 4, 5, 6)
    erPrimaer: integer("er_primaer", { mode: "boolean" }).notNull().default(false), // # Om positionen er primær
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.spillerId, table.position] }), // # Primærnøgle er kombinationen af spiller-id og position
    };
  }
);

// # Konstanter for offensive positioner
export const OFFENSIVE_POSITIONER = ["VF", "VB", "PM", "HB", "HF", "ST"] as const;
export type OffensivPosition = typeof OFFENSIVE_POSITIONER[number];

// # Konstanter for defensive positioner
export const DEFENSIVE_POSITIONER = ["1", "2", "3", "4", "5", "6"] as const;
export type DefensivPosition = typeof DEFENSIVE_POSITIONER[number]; 