# Guide til at Køre Database Migrations

Denne guide hjælper dig med at oprette de nødvendige databasetabeller til at gemme lokale ændringer i træningsøvelser.

## Problem

Hvis du ser fejlbeskeden `no such table: traening_oevelse_detaljer`, betyder det, at du skal oprette nye tabeller i din database ved at køre migrations.

## Løsning

### Trin 1: Installer nødvendige pakker

Først skal du sikre dig, at du har de nødvendige pakker installeret:

```bash
npm install drizzle-kit ts-node --save-dev
```

### Trin 2: Generer migrations

Generer en migrationsfil baseret på ændringerne i dit skema:

```bash
npx drizzle-kit generate:sqlite --schema=lib/db/schema.ts --out=drizzle
```

Dette vil oprette en ny migrationsfil i mappen `drizzle`.

### Trin 3: Kør migrations

Nu kan du køre migrations for at opdatere din database:

```bash
npx ts-node lib/db/migrate.ts
```

### Trin 4: Genstart serveren

Genstart udviklingsserveren:

```bash
npm run dev
```

## Problemløsning

Hvis du stadig oplever problemer, kan du prøve følgende:

1. **Check om migrations-mappen eksisterer**:
   Sørg for at mappen `drizzle` er blevet oprettet

2. **Tjek migrationsfilen**:
   Åbn migrationsfilen i `drizzle` mappen og bekræft at den indeholder CREATE TABLE statements for:
   - `traening_oevelse_detaljer`
   - `traening_oevelse_fokuspunkter`

3. **Alternativ løsning - Opret tabellerne manuelt**:
   Hvis migrations ikke virker, kan du køre disse SQL kommandoer direkte:

   ```sql
   CREATE TABLE IF NOT EXISTS traening_oevelse_detaljer (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     traening_oevelse_id INTEGER NOT NULL REFERENCES traening_oevelser(id) ON DELETE CASCADE,
     navn TEXT,
     beskrivelse TEXT,
     kategori_navn TEXT,
     sidst_opdateret INTEGER NOT NULL DEFAULT (unixepoch())
   );

   CREATE TABLE IF NOT EXISTS traening_oevelse_fokuspunkter (
     traening_oevelse_id INTEGER NOT NULL REFERENCES traening_oevelser(id) ON DELETE CASCADE,
     fokuspunkt_id INTEGER NOT NULL REFERENCES fokuspunkter(id) ON DELETE CASCADE,
     PRIMARY KEY (traening_oevelse_id, fokuspunkt_id)
   );
   ```

   Du kan køre disse kommandoer med et SQLite værktøj som DB Browser for SQLite. 