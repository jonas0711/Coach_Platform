import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const hold = sqliteTable("hold", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull(),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const spillere = sqliteTable("spillere", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holdId: integer("hold_id").notNull().references(() => hold.id, { onDelete: "cascade" }),
  navn: text("navn").notNull(),
  nummer: integer("nummer"),
  erMV: integer("er_mv", { mode: "boolean" }).notNull().default(false),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const traeninger = sqliteTable("traeninger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holdId: integer("hold_id").references(() => hold.id, { onDelete: "cascade" }),
  navn: text("navn").notNull(),
  beskrivelse: text("beskrivelse"),
  dato: integer("dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  flereTilmeldte: integer("flere_tilmeldte", { mode: "boolean" }).notNull().default(false),
});

export const traeningHold = sqliteTable(
  "traening_hold",
  {
    traeningId: integer("traening_id")
      .notNull()
      .references(() => traeninger.id, { onDelete: "cascade" }),
    holdId: integer("hold_id")
      .notNull()
      .references(() => hold.id, { onDelete: "cascade" }),
    tilmeldtDato: integer("tilmeldt_dato", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.traeningId, table.holdId] }),
    };
  }
);

export const traeningDeltager = sqliteTable(
  "traening_deltager",
  {
    traeningId: integer("traening_id")
      .notNull()
      .references(() => traeninger.id, { onDelete: "cascade" }),
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }),
    tilstede: integer("tilstede", { mode: "boolean" }).notNull().default(true),
    registreretDato: integer("registreret_dato", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.traeningId, table.spillerId] }),
    };
  }
);

export const offensivePositioner = sqliteTable(
  "offensive_positioner",
  {
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    erPrimaer: integer("er_primaer", { mode: "boolean" }).notNull().default(false),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.spillerId, table.position] }),
    };
  }
);

export const defensivePositioner = sqliteTable(
  "defensive_positioner",
  {
    spillerId: integer("spiller_id")
      .notNull()
      .references(() => spillere.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    erPrimaer: integer("er_primaer", { mode: "boolean" }).notNull().default(false),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.spillerId, table.position] }),
    };
  }
);

export const kategorier = sqliteTable("kategorier", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull().unique(),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const fokuspunkter = sqliteTable("fokuspunkter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tekst: text("tekst").notNull().unique(),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const oevelser = sqliteTable("oevelser", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  navn: text("navn").notNull(),
  beskrivelse: text("beskrivelse"),
  billedeSti: text("billede_sti"),
  brugerPositioner: integer("bruger_positioner", { mode: "boolean" }).notNull().default(false),
  minimumDeltagere: integer("minimum_deltagere"),
  kategoriId: integer("kategori_id").references(() => kategorier.id),
  originalPositionerNavn: text("original_positioner_navn"),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const oevelseVariationer = sqliteTable("oevelse_variationer", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  oevelseId: integer("oevelse_id")
    .notNull()
    .references(() => oevelser.id, { onDelete: "cascade" }),
  navn: text("navn").notNull(),
  beskrivelse: text("beskrivelse"),
  oprettetDato: integer("oprettet_dato", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const oevelsePositioner = sqliteTable(
  "oevelse_positioner",
  {
    oevelseId: integer("oevelse_id")
      .notNull()
      .references(() => oevelser.id, { onDelete: "cascade" }),
    variationId: integer("variation_id")
      .references(() => oevelseVariationer.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    antalKraevet: integer("antal_kraevet").notNull().default(0),
    erOffensiv: integer("er_offensiv", { mode: "boolean" }).notNull().default(true),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.oevelseId, table.variationId, table.position] }),
    };
  }
);

export const oevelseFokuspunkter = sqliteTable(
  "oevelse_fokuspunkter",
  {
    oevelseId: integer("oevelse_id")
      .notNull()
      .references(() => oevelser.id, { onDelete: "cascade" }),
    fokuspunktId: integer("fokuspunkt_id")
      .notNull()
      .references(() => fokuspunkter.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.oevelseId, table.fokuspunktId] }),
    };
  }
); 