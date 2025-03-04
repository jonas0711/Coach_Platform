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

// # Tabel for træninger
// # Indeholder oplysninger om en træningssession og dens tilknytning til et hold
export const traeninger = sqliteTable("traeninger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holdId: integer("hold_id").references(() => hold.id, { onDelete: "cascade" }), // # Relation til et hold (kan være null ved flere hold)
  navn: text("navn").notNull(), // # Træningens navn er påkrævet
  beskrivelse: text("beskrivelse"), // # Valgfri beskrivelse af træningen
  dato: integer("dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Træningsdato, standardværdi er nu
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
  flereTilmeldte: integer("flere_tilmeldte", { mode: "boolean" }).notNull().default(false), // # Flag der indikerer om der er flere hold tilmeldt
});

// # Tabel for hold der deltager i en træning
// # Bruges til at forbinde træninger med flere hold
export const traeningHold = sqliteTable(
  "traening_hold",
  {
    traeningId: integer("traening_id")
      .notNull()
      .references(() => traeninger.id, { onDelete: "cascade" }), // # Reference til træning
    holdId: integer("hold_id")
      .notNull()
      .references(() => hold.id, { onDelete: "cascade" }), // # Reference til hold
    tilmeldtDato: integer("tilmeldt_dato", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()), // # Dato for tilmelding
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.traeningId, table.holdId] }), // # Primærnøgle er kombinationen af træning-id og hold-id
    };
  }
);

// # Tabel for spillere der deltager i en træning
// # Bruges til at registrere hvilke spillere der er til stede
export const traeningDeltager = sqliteTable(
  "traening_deltager",
  {
    traeningId: integer("traening_id")
      .notNull()
      .references(() => traeninger.id, { onDelete: "cascade" }), // # Reference til træning
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }), // # Reference til spiller
    tilstede: integer("tilstede", { mode: "boolean" }).notNull().default(true), // # Om spilleren er til stede
    registreretDato: integer("registreret_dato", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()), // # Dato for registrering
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.traeningId, table.spillerId] }), // # Primærnøgle er kombinationen af træning-id og spiller-id
    };
  }
);

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

// # Tabel for kategorier
// # Indeholder information om kategorier for øvelser
export const kategorier = sqliteTable("kategorier", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull().unique(), // # Kategorinavnet er påkrævet og unikt
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
});

// # Tabel for fokuspunkter
// # Indeholder information om fokuspunkter til øvelser
export const fokuspunkter = sqliteTable("fokuspunkter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tekst: text("tekst").notNull().unique(), // # Fokuspunktets tekst er påkrævet og unik
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
});

// # Tabel for øvelser
// # Indeholder information om træningsøvelser
export const oevelser = sqliteTable("oevelser", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull(), // # Øvelsens navn er påkrævet
  beskrivelse: text("beskrivelse"), // # Valgfri beskrivelse af øvelsen
  billedeSti: text("billede_sti"), // # Sti til billede af øvelsen
  brugerPositioner: integer("bruger_positioner", { mode: "boolean" }).notNull().default(false), // # Flag der indikerer om øvelsen bruger positioner
  minimumDeltagere: integer("minimum_deltagere"), // # Minimum antal deltagere hvis positioner ikke bruges
  kategoriId: integer("kategori_id").references(() => kategorier.id), // # Reference til kategori (optional)
  originalPositionerNavn: text("original_positioner_navn"), // # Navn for de originale positioner
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
});

// # Tabel for øvelsesvariationer
// # Indeholder information om forskellige variationer af samme øvelse
export const oevelseVariationer = sqliteTable("oevelse_variationer", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  oevelseId: integer("oevelse_id")
    .notNull()
    .references(() => oevelser.id, { onDelete: "cascade" }), // # Reference til hovedøvelsen
  navn: text("navn").notNull(), // # Variationens navn (f.eks. "Venstre side" eller "Højre side")
  beskrivelse: text("beskrivelse"), // # Valgfri beskrivelse af variationen
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // # Automatisk tidsstempel for oprettelse
});

// # Tabel for positionskrav i øvelser
// # Definerer hvor mange spillere der kræves for hver position i en øvelse
export const oevelsePositioner = sqliteTable(
  "oevelse_positioner",
  {
    oevelseId: integer("oevelse_id")
      .notNull()
      .references(() => oevelser.id, { onDelete: "cascade" }), // # Reference til øvelse
    variationId: integer("variation_id")
      .references(() => oevelseVariationer.id, { onDelete: "cascade" }), // # Reference til variation (optional)
    position: text("position").notNull(), // # Positionens navn
    antalKraevet: integer("antal_kraevet").notNull().default(0), // # Antal påkrævede spillere i denne position
    erOffensiv: integer("er_offensiv", { mode: "boolean" }).notNull().default(true), // # Om det er en offensiv position
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.oevelseId, table.variationId, table.position] }), // # Primærnøgle er kombinationen af øvelses-id, variations-id og position
    };
  }
);

// # Tabel for relation mellem øvelser og fokuspunkter
// # Mange-til-mange relation mellem øvelser og fokuspunkter
export const oevelseFokuspunkter = sqliteTable(
  "oevelse_fokuspunkter",
  {
    oevelseId: integer("oevelse_id")
      .notNull()
      .references(() => oevelser.id, { onDelete: "cascade" }), // # Reference til øvelse
    fokuspunktId: integer("fokuspunkt_id")
      .notNull()
      .references(() => fokuspunkter.id, { onDelete: "cascade" }), // # Reference til fokuspunkt
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.oevelseId, table.fokuspunktId] }), // # Primærnøgle er kombinationen af øvelses-id og fokuspunkt-id
    };
  }
);

// # Konstanter for offensive positioner
export const OFFENSIVE_POSITIONER = ["VF", "VB", "PM", "HB", "HF", "ST"] as const;
export type OffensivPosition = typeof OFFENSIVE_POSITIONER[number];

// # Konstanter for defensive positioner
export const DEFENSIVE_POSITIONER = ["1", "2", "3", "4", "5", "6"] as const;
export type DefensivPosition = typeof DEFENSIVE_POSITIONER[number];

// # Position type for øvelser
export type Position = {
  position: string;
  antalKraevet: number;
  erOffensiv: boolean;
}; 