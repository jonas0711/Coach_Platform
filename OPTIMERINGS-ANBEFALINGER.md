# Optimeringsanbefalinger for Coach Platform

Dette dokument indeholder anbefalinger til yderligere optimering af Coach Platform for at forbedre ydeevnen, især med fokus på reducering af ventetider.

## Allerede implementerede optimeringer

1. **Databaseforbindelser**: Ændret til singleton-mønster for at undgå gentagne databaseforbindelser
2. **Reduceret N+1 forespørgselsproblemer**: Optimeret databaseforespørgsler i træning-sider
3. **Oprettet indekser**: Tilføjet indekser til ofte brugte tabeller og kolonner
4. **Parallel datahentning**: Implementeret Promise.all for at køre uafhængige forespørgsler samtidigt

## Yderligere anbefalinger til implementering

### 1. Implementer Server-Side Caching

```typescript
// Eksempel på implementering af server-side caching med node-cache
import NodeCache from 'node-cache';

// Opret en cache med standard TTL på 5 minutter
const cache = new NodeCache({ stdTTL: 300 });

// Eksempel på brug i en funktion, der henter data
async function hentAlleHold() {
  // Cache-nøgle for denne forespørgsel
  const cacheKey = 'alle-hold';
  
  // Tjek om data allerede findes i cachen
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("Returnerer cachelagret data for hold");
    return cachedData;
  }
  
  // Hvis ikke i cache, hent fra database
  try {
    const holdData = await db.select().from(hold).orderBy(hold.navn);
    
    // Gem resultatet i cachen til fremtidig brug
    cache.set(cacheKey, holdData);
    
    return holdData;
  } catch (error) {
    console.error("Fejl ved hentning af hold:", error);
    throw error;
  }
}
```

Overvej at implementere caching for:
- Liste over alle hold
- Træningsoversigter
- Spillerlister

### 2. Optimér frontenddataoverførsel med mere granulære API-endepunkter

Opdel større dataforespørgsler i mindre, mere målrettede endepunkter, der kun returnerer præcis de data, som en given side har brug for.

For eksempel, i stedet for at returnere spillerens komplette data med alle positioner:

```typescript
// Implementer specialiserede route handlers med fokus på minimal data-overførsel
export async function hentSpillereMedMinimalInfo(holdId: number) {
  // Returner kun ID, navn og nummer - bruges til dropdown menuer og lister
  return await db
    .select({
      id: spillere.id,
      navn: spillere.navn,
      nummer: spillere.nummer
    })
    .from(spillere)
    .where(eq(spillere.holdId, holdId));
}
```

### 3. Implementér Inkrementel Statisk Regenerering (ISR) for semi-statiske sider

For sider der ikke ændrer sig ofte, brug Next.js ISR til at generere statiske sider, der opdateres med et bestemt interval.

```typescript
// På siden export en revalidate egenskab
export const revalidate = 3600; // Revalider hver time

// Eller brug generateStaticParams for at pre-rendere specifikke routes
export async function generateStaticParams() {
  const hold = await hentAlleHold();
  
  return hold.map((h) => ({
    id: h.id.toString(),
  }));
}
```

### 4. Implementer bedre fejlhåndtering og gentagelsesstrategi for database-operationer

```typescript
// Implementer retryWrapper til at håndtere midlertidige fejl
async function retryWrapper<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 300
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.warn(`Operation fejlede, prøver igen om ${delay}ms. Forsøg tilbage: ${retries-1}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryWrapper(operation, retries - 1, delay * 2);
  }
}

// Brug i databaseoperationer
async function hentSikkerDataFraDB() {
  return retryWrapper(async () => {
    return await db.select().from(hold);
  });
}
```

### 5. Optimer databaseskemaet

Overvej at normalisere databaseskemaet yderligere for at reducere dataduplikation og forbedre ydeevnen:

- Hvis der er mange gentagne strenge (f.eks. positionsnavne), overvej at flytte dem til en separat tabel
- Implementer materialiserede views for komplekse, ofte brugte forespørgsler

### 6. Implementer Progressiv Indlæsning af Brugergrænsefladen

Brug af skeletonskomponenter eller suspense til at vise dele af UI'en tidligt:

```tsx
// I stedet for at lade hele siden vente på al data
export default async function HoldPage() {
  return (
    <Suspense fallback={<HoldSkeleton />}>
      <HoldData />
    </Suspense>
  );
}

// Komponenten der henter data
async function HoldData() {
  const hold = await hentAlleHold();
  // ...resten af komponenten
}
```

### 7. Overførselsoptimering

- Implementer HTTP/2 for parallelle forespørgsler
- Brug Edge Runtime til endepunkter der skal være meget hurtige
- Overvej at flytte databasen til den samme region som applikationsserveren for at reducere netværkslatens

## Næste skridt

1. Implementer disse optimeringer gradvist og mål deres effekt
2. Start med de anbefalinger, der har størst potentielle gevinst med mindst mulig risiko
3. Implementer passende overvågning og ydeevnemåling for at bekræfte de faktiske gevinster 