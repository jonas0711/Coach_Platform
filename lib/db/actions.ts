"use server";

import { db, hold, spillere, offensivePositioner, defensivePositioner, traeninger, traeningHold, traeningDeltager, oevelser, oevelsePositioner, kategorier, fokuspunkter, oevelseFokuspunkter, oevelseVariationer, traeningOevelseDeltagere, traeningOevelser, traeningOevelseDetaljer, traeningOevelseFokuspunkter, traeningOevelseSpillerPositioner } from "./index";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  OFFENSIVE_POSITIONER, 
  DEFENSIVE_POSITIONER, 
  type OffensivPosition, 
  type DefensivPosition 
} from "./schema";

// # Interface for spiller data
export interface SpillerData {
  navn: string;
  nummer?: number;
  erMV: boolean;
  offensivRating?: number; // # Rating for offensive evner (1-10)
  defensivRating?: number; // # Rating for defensive evner (1-10)
  offensivePositioner: {
    position: OffensivPosition;
    erPrimaer: boolean;
  }[];
  defensivePositioner: {
    position: DefensivPosition;
    erPrimaer: boolean;
  }[];
}

// # Interface for trænings data
export interface TraeningData {
  navn: string;
  beskrivelse?: string;
  dato?: Date;
  holdIds?: number[]; // # Array af holdIds, hvis træningen har flere tilknyttede hold
}

// # Interface for øvelses variation
export interface OevelseVariation {
  navn: string;
  beskrivelse?: string;
  positioner: {
    position: string;
    antalKraevet: number;
    erOffensiv: boolean;
  }[];
}

// # Interface for øvelses data
export interface OevelseData {
  navn: string;
  beskrivelse?: string;
  billedeSti?: string;
  brugerPositioner: boolean;
  minimumDeltagere?: number;
  positioner?: {
    position: string;
    antalKraevet: number;
    erOffensiv: boolean;
  }[];
  originalPositionerNavn?: string; // # Navn for de originale positioner
  variationer?: OevelseVariation[]; // # Liste af variationer for øvelsen
  kategori?: string; // # Kategoriens navn
  fokuspunkter?: string; // # Kommasepareret liste af fokuspunkter
}

// # Interface for øvelses positioner
export interface OevelsePosition {
  oevelseId: number;
  position: string;
  antalKraevet: number;
  erOffensiv: boolean;
}

// # Opret nyt hold
// # Tager et navn som parameter og indsætter det i databasen
export async function opretHold(navn: string) {
  // # Validér at navnet ikke er tomt
  if (!navn || navn.trim() === "") {
    throw new Error("Holdnavn må ikke være tomt");
  }

  try {
    // # Indsæt hold i databasen
    console.log(`Opretter hold med navn: ${navn}`);
    const result = await db.insert(hold).values({ navn }).returning({ id: hold.id });
    
    // # Log resultatet for debugging
    console.log("Hold oprettet:", result);
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/hold");
    
    // # Returner det oprettede holds ID
    return result[0].id;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved oprettelse af hold:", error);
    throw new Error(`Kunne ikke oprette hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle hold
export async function hentAlleHold() {
  try {
    // # Hent alle hold fra databasen
    console.log("Henter alle hold");
    return await db.select().from(hold).orderBy(hold.navn);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved hentning af hold:", error);
    throw new Error(`Kunne ikke hente hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent specifikt hold med ID
export async function hentHold(id: number) {
  try {
    // # Hent hold med specifikt ID
    const result = await db.select().from(hold).where(eq(hold.id, id));
    
    // # Return null hvis holdet ikke findes
    if (result.length === 0) {
      return null;
    }
    
    // # Returner det fundne hold
    return result[0];
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af hold med ID ${id}:`, error);
    throw new Error(`Kunne ikke hente hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent hold baseret på navn
export async function hentHoldMedNavn(navn: string) {
  try {
    // # Log forsøget på at hente holdet
    console.log(`Forsøger at hente hold med navn: ${navn}`);
    
    // # Søg efter hold med eksakt navn
    const result = await db.select().from(hold).where(eq(hold.navn, navn));
    
    // # Return null hvis holdet ikke findes
    if (result.length === 0) {
      console.log(`Ingen hold fundet med navnet: ${navn}`);
      return null;
    }
    
    // # Returner det fundne hold
    console.log(`Hold fundet: ${result[0].navn} (ID: ${result[0].id})`);
    return result[0];
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af hold med navn ${navn}:`, error);
    throw new Error(`Kunne ikke hente hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opret ny spiller til et specifikt hold
export async function opretSpiller(holdId: number, spillerData: SpillerData) {
  // # Validér at navn ikke er tomt
  if (!spillerData.navn || spillerData.navn.trim() === "") {
    throw new Error("Spillernavn må ikke være tomt");
  }

  // # Validér ratings hvis spilleren ikke er målvogter
  if (!spillerData.erMV) {
    if (spillerData.offensivRating !== undefined) {
      if (spillerData.offensivRating < 1 || spillerData.offensivRating > 10) {
        throw new Error("Offensiv rating skal være mellem 1 og 10");
      }
    }
    if (spillerData.defensivRating !== undefined) {
      if (spillerData.defensivRating < 1 || spillerData.defensivRating > 10) {
        throw new Error("Defensiv rating skal være mellem 1 og 10");
      }
    }
  }

  // # Validér at målvogtere ikke har positioner eller ratings
  if (spillerData.erMV) {
    // # Hvis spilleren er målvogter, skal de ikke have positioner eller ratings
    spillerData.offensivePositioner = [];
    spillerData.defensivePositioner = [];
    spillerData.offensivRating = undefined;
    spillerData.defensivRating = undefined;
  } else {
    // # Validér offensive positioner (skal have præcis én primær)
    const primærOffensiv = spillerData.offensivePositioner.filter(p => p.erPrimaer);
    if (primærOffensiv.length !== 1) {
      throw new Error("Spilleren skal have præcis én primær offensiv position");
    }

    // # Validér defensive positioner (skal have 1-2 primære)
    const primærDefensiv = spillerData.defensivePositioner.filter(p => p.erPrimaer);
    if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
      throw new Error("Spilleren skal have 1-2 primære defensive positioner");
    }
  }

  try {
    // # Indsæt spiller uden transaktion først, så vi kan få ID'et
    console.log(`Opretter spiller med navn "${spillerData.navn}" til hold med ID: ${holdId}`);
    
    // # Indsæt spiller med almindelig Drizzle tilgang
    await db.insert(spillere).values({
      holdId,
      navn: spillerData.navn,
      nummer: spillerData.nummer,
      erMV: spillerData.erMV,
      offensivRating: spillerData.erMV ? undefined : spillerData.offensivRating,
      defensivRating: spillerData.erMV ? undefined : spillerData.defensivRating,
    });
    
    // # Få id for sidst indsatte spiller ved at søge efter navn og holdId
    const sidstIndsatteSpiller = await db.select()
      .from(spillere)
      .where(and(
        eq(spillere.navn, spillerData.navn),
        eq(spillere.holdId, holdId)
      ))
      .orderBy(spillere.id)
      .limit(1);
    
    // # Sikker kontrol af resultatet
    if (!sidstIndsatteSpiller || sidstIndsatteSpiller.length === 0) {
      throw new Error("Kunne ikke finde den nyoprettede spiller");
    }
    
    // # Udpak id
    const spillerId = sidstIndsatteSpiller[0].id;
    
    console.log(`Spiller oprettet med ID: ${spillerId}`);
    
    // # Hvis ikke målvogter, opret positioner
    if (!spillerData.erMV) {
      // # Opret offensive positioner
      for (const pos of spillerData.offensivePositioner) {
        await db.insert(offensivePositioner).values({
          spillerId,
          position: pos.position,
          erPrimaer: pos.erPrimaer,
        });
      }

      // # Opret defensive positioner
      for (const pos of spillerData.defensivePositioner) {
        await db.insert(defensivePositioner).values({
          spillerId,
          position: pos.position,
          erPrimaer: pos.erPrimaer,
        });
      }
    }
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/hold/${holdId}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved oprettelse af spiller:", error);
    throw new Error(`Kunne ikke oprette spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle spillere for et specifikt hold
export async function hentSpillereTilHold(holdId: number) {
  try {
    // # Hent spillere for det angivne hold
    console.log(`Henter spillere for hold med ID: ${holdId}`);
    
    // # Foretag en enkelt forespørgsel for at hente alle spillere
    const spillereListe = await db.select().from(spillere).where(eq(spillere.holdId, holdId));
    
    // # Performance optimering: Cacher for at reducere antallet af databaseforespørgsler
    const offensivePositionerCache = new Map();
    const defensivePositionerCache = new Map();
    
    // # Sammensæt data for spillere
    const spillereMedPositioner = await Promise.all(
      spillereListe.map(async (spiller) => {
        // # Hvis spilleren er målvogter, returner dem uden at hente positioner
        if (spiller.erMV) {
          return {
            ...spiller,
            offensivePositioner: [],
            defensivePositioner: []
          };
        }

        // # Tjek cache først for offensive positioner
        let offensivePosListe;
        if (offensivePositionerCache.has(spiller.id)) {
          offensivePosListe = offensivePositionerCache.get(spiller.id);
        } else {
          // # Hent offensive positioner for denne spiller
          offensivePosListe = await db
            .select()
            .from(offensivePositioner)
            .where(eq(offensivePositioner.spillerId, spiller.id));
            
          // # Gem i cache til fremtidig brug
          offensivePositionerCache.set(spiller.id, offensivePosListe);
        }

        // # Tjek cache først for defensive positioner
        let defensivePosListe;
        if (defensivePositionerCache.has(spiller.id)) {
          defensivePosListe = defensivePositionerCache.get(spiller.id);
        } else {
          // # Hent defensive positioner for denne spiller
          defensivePosListe = await db
            .select()
            .from(defensivePositioner)
            .where(eq(defensivePositioner.spillerId, spiller.id));
            
          // # Gem i cache til fremtidig brug
          defensivePositionerCache.set(spiller.id, defensivePosListe);
        }

        // # Returner spiller med positioner
        return {
          ...spiller,
          offensivePositioner: offensivePosListe,
          defensivePositioner: defensivePosListe,
        };
      })
    );

    return spillereMedPositioner;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af spillere for hold ${holdId}:`, error);
    throw new Error(`Kunne ikke hente spillere: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent specifik spiller med ID
export async function hentSpiller(spillerId: number) {
  try {
    // # Hent spiller med specifikt ID
    console.log(`Henter spiller med ID: ${spillerId}`);
    const spiller = await db.select().from(spillere).where(eq(spillere.id, spillerId));
    
    // # Return null hvis spilleren ikke findes
    if (spiller.length === 0) {
      return null;
    }
    
    const spillerData = spiller[0];
    
    // # Hvis spilleren er målvogter, returner den uden positioner
    if (spillerData.erMV) {
      return {
        ...spillerData,
        offensivePositioner: [],
        defensivePositioner: []
      };
    }
    
    // # Hent offensive positioner
    const offensivePosListe = await db
      .select()
      .from(offensivePositioner)
      .where(eq(offensivePositioner.spillerId, spillerId));
      
    // # Hent defensive positioner
    const defensivePosListe = await db
      .select()
      .from(defensivePositioner)
      .where(eq(defensivePositioner.spillerId, spillerId));
      
    // # Returner spiller med positioner
    return {
      ...spillerData,
      offensivePositioner: offensivePosListe,
      defensivePositioner: defensivePosListe,
    };
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af spiller med ID ${spillerId}:`, error);
    throw new Error(`Kunne ikke hente spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opdater eksisterende hold
export async function opdaterHold(id: number, navn: string) {
  // # Validér at navnet ikke er tomt
  if (!navn || navn.trim() === "") {
    throw new Error("Holdnavn må ikke være tomt");
  }

  try {
    // # Opdater hold i databasen
    console.log(`Opdaterer hold med ID ${id} til nyt navn: ${navn}`);
    await db.update(hold).set({ navn }).where(eq(hold.id, id));
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/hold");
    revalidatePath(`/hold/${id}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved opdatering af hold med ID ${id}:`, error);
    throw new Error(`Kunne ikke opdatere hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Slet hold
export async function sletHold(id: number) {
  try {
    // # Slet hold fra databasen - cascade vil automatisk slette relaterede spillere
    console.log(`Sletter hold med ID: ${id}`);
    await db.delete(hold).where(eq(hold.id, id));
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/hold");
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved sletning af hold med ID ${id}:`, error);
    throw new Error(`Kunne ikke slette hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opdater eksisterende spiller
export async function opdaterSpiller(spillerId: number, spillerData: SpillerData) {
  // # Validér at navn ikke er tomt
  if (!spillerData.navn || spillerData.navn.trim() === "") {
    throw new Error("Spillernavn må ikke være tomt");
  }

  // # Validér ratings hvis spilleren ikke er målvogter
  if (!spillerData.erMV) {
    if (spillerData.offensivRating !== undefined) {
      if (spillerData.offensivRating < 1 || spillerData.offensivRating > 10) {
        throw new Error("Offensiv rating skal være mellem 1 og 10");
      }
    }
    if (spillerData.defensivRating !== undefined) {
      if (spillerData.defensivRating < 1 || spillerData.defensivRating > 10) {
        throw new Error("Defensiv rating skal være mellem 1 og 10");
      }
    }
  }

  try {
    // # Hent eksisterende spiller for at tjekke om MV status ændres
    console.log(`Henter spiller med ID: ${spillerId}`);
    const eksisterendeSpiller = await db.select().from(spillere).where(eq(spillere.id, spillerId));
    
    if (!eksisterendeSpiller || eksisterendeSpiller.length === 0) {
      throw new Error("Spilleren blev ikke fundet");
    }

    // # Hvis spilleren bliver målvogter, fjern positioner og ratings
    if (spillerData.erMV) {
      spillerData.offensivePositioner = [];
      spillerData.defensivePositioner = [];
      spillerData.offensivRating = undefined;
      spillerData.defensivRating = undefined;
    } else {
      // # Validér offensive positioner (skal have præcis én primær)
      const primærOffensiv = spillerData.offensivePositioner.filter(p => p.erPrimaer);
      if (primærOffensiv.length !== 1) {
        throw new Error("Spilleren skal have præcis én primær offensiv position");
      }

      // # Validér defensive positioner (skal have 1-2 primære)
      const primærDefensiv = spillerData.defensivePositioner.filter(p => p.erPrimaer);
      if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
        throw new Error("Spilleren skal have 1-2 primære defensive positioner");
      }
    }

    // # Gem holdId til sti-revalidering
    const holdId = eksisterendeSpiller[0].holdId;

    // # Opdater spillerens grundlæggende information
    await db.update(spillere)
      .set({
        navn: spillerData.navn,
        nummer: spillerData.nummer,
        erMV: spillerData.erMV,
        offensivRating: spillerData.erMV ? undefined : spillerData.offensivRating,
        defensivRating: spillerData.erMV ? undefined : spillerData.defensivRating,
      })
      .where(eq(spillere.id, spillerId));

    // # Håndter positioner
    if (spillerData.erMV) {
      // # Slet alle positioner hvis spilleren er målvogter
      await db.delete(offensivePositioner).where(eq(offensivePositioner.spillerId, spillerId));
      await db.delete(defensivePositioner).where(eq(defensivePositioner.spillerId, spillerId));
    } else {
      // # Slet alle nuværende positioner
      await db.delete(offensivePositioner).where(eq(offensivePositioner.spillerId, spillerId));
      await db.delete(defensivePositioner).where(eq(defensivePositioner.spillerId, spillerId));
      
      // # Opret nye offensive positioner
      for (const pos of spillerData.offensivePositioner) {
        await db.insert(offensivePositioner).values({
          spillerId,
          position: pos.position,
          erPrimaer: pos.erPrimaer,
        });
      }

      // # Opret nye defensive positioner
      for (const pos of spillerData.defensivePositioner) {
        await db.insert(defensivePositioner).values({
          spillerId,
          position: pos.position,
          erPrimaer: pos.erPrimaer,
        });
      }
    }
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/hold/${holdId}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved opdatering af spiller:", error);
    throw new Error(`Kunne ikke opdatere spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Slet spiller
export async function sletSpiller(spillerId: number) {
  try {
    // # Hent spilleren først for at få holdId til sti-revalidering
    const spiller = await db.select().from(spillere).where(eq(spillere.id, spillerId));
    if (spiller.length === 0) {
      throw new Error("Spilleren findes ikke");
    }
    const holdId = spiller[0].holdId;
    
    // # Slet spilleren fra databasen - cascade vil håndtere relationer
    console.log(`Sletter spiller med ID: ${spillerId}`);
    await db.delete(spillere).where(eq(spillere.id, spillerId));
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/hold/${holdId}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved sletning af spiller med ID ${spillerId}:`, error);
    throw new Error(`Kunne ikke slette spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Trænings-relaterede database funktioner

// # Opret ny træning (med mulighed for flere hold)
export async function opretTraening(traeningData: TraeningData) {
  // # Validér at navn ikke er tomt
  if (!traeningData.navn || traeningData.navn.trim() === "") {
    throw new Error("Træningsnavn må ikke være tomt");
  }

  try {
    // # Standard træningsdato er i dag, hvis ikke angivet
    const dato = traeningData.dato || new Date();
    
    // # Tjek om træningen har flere hold tilknyttet
    const flereTilmeldte = Array.isArray(traeningData.holdIds) && traeningData.holdIds.length > 0;
    
    // # Hvis træningen kun har ét hold og det er angivet, sæt holdId på træningen
    let holdId = undefined;
    if (Array.isArray(traeningData.holdIds) && traeningData.holdIds.length === 1) {
      holdId = traeningData.holdIds[0];
    }
    
    // # Indsæt træning i databasen
    console.log(`Opretter træning med navn: ${traeningData.navn}`);
    
    const result = await db.insert(traeninger).values({
      navn: traeningData.navn,
      beskrivelse: traeningData.beskrivelse,
      dato,
      holdId,
      flereTilmeldte,
    }).returning({ id: traeninger.id });
    
    const traeningId = result[0].id;
    
    // # Hvis der er flere hold, opret relationer
    if (flereTilmeldte && Array.isArray(traeningData.holdIds)) {
      console.log(`Tilmelder ${traeningData.holdIds.length} hold til træningen`);
      
      // # Opret en relation for hvert hold
      for (const holdId of traeningData.holdIds) {
        await db.insert(traeningHold).values({
          traeningId,
          holdId,
        });
      }
    }
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/traening");
    
    // # Returner det oprettede trænings ID
    return traeningId;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved oprettelse af træning:", error);
    throw new Error(`Kunne ikke oprette træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opret fælles træning (med flere hold)
export async function opretFaellesTraening(traeningData: TraeningData) {
  // # Her bruger vi den normale opretTraening funktion med flereTilmeldte = true
  const resultat = await db.insert(traeninger).values({
    navn: traeningData.navn,
    beskrivelse: traeningData.beskrivelse,
    dato: traeningData.dato || new Date(),
    flereTilmeldte: true,
  }).returning({ id: traeninger.id });

  const traeningId = resultat[0].id;
  
  // # Hvis der er tilknyttede hold, opret relationer
  if (Array.isArray(traeningData.holdIds)) {
    console.log(`Tilmelder ${traeningData.holdIds.length} hold til træningen`);
    
    // # Opret en relation for hvert hold
    for (const holdId of traeningData.holdIds) {
      await db.insert(traeningHold).values({
        traeningId,
        holdId,
      });
    }
  }
  
  // # Revalidér stien så siden opdateres
  revalidatePath("/traening");
  
  // # Returner det oprettede trænings ID
  return traeningId;
}

// # Hent specifik træning med ID
export async function hentTraening(id: number) {
  try {
    // # Hent træning med specifikt ID
    console.log(`Henter træning med ID: ${id}`);
    const result = await db.select().from(traeninger).where(eq(traeninger.id, id));
    
    // # Return null hvis træningen ikke findes
    if (result.length === 0) {
      return null;
    }
    
    // # Returner det fundne træning
    return result[0];
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af træning med ID ${id}:`, error);
    throw new Error(`Kunne ikke hente træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opdater træningsinformation
export async function opdaterTraening(id: number, data: Partial<Pick<typeof traeninger.$inferSelect, "navn" | "beskrivelse" | "dato">>) {
  try {
    // # Opdater træningen i databasen
    console.log(`Opdaterer træning med ID: ${id}`);
    await db.update(traeninger)
      .set(data)
      .where(eq(traeninger.id, id));
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/traening/faelles/${id}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved opdatering af træning med ID ${id}:`, error);
    throw new Error(`Kunne ikke opdatere træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Slet træning
export async function sletTraening(id: number) {
  try {
    // # Slet træningen fra databasen
    console.log(`Sletter træning med ID: ${id}`);
    await db.delete(traeninger).where(eq(traeninger.id, id));
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/traening/faelles`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved sletning af træning med ID ${id}:`, error);
    throw new Error(`Kunne ikke slette træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Tilmeld hold til træning
export async function tilmeldHoldTilTraening(traeningId: number, holdIds: number[]) {
  try {
    // # Først fjern alle eksisterende tilmeldinger
    console.log(`Fjerner eksisterende holdtilmeldinger for træning ID: ${traeningId}`);
    await db.delete(traeningHold).where(eq(traeningHold.traeningId, traeningId));
    
    // # Derefter tilføj de nye tilmeldinger
    console.log(`Tilmelder ${holdIds.length} hold til træning ID: ${traeningId}`);
    
    for (const holdId of holdIds) {
      await db.insert(traeningHold).values({
        traeningId,
        holdId,
      });
    }
    
    // # Opdater træningen til at have flereTilmeldte flag
    await db.update(traeninger)
      .set({ 
        flereTilmeldte: holdIds.length > 1,
        holdId: holdIds.length === 1 ? holdIds[0] : null
      })
      .where(eq(traeninger.id, traeningId));
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved tilmelding af hold til træning ID ${traeningId}:`, error);
    throw new Error(`Kunne ikke tilmelde hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Registrer tilstedeværelse for spillere ved en træning
export async function registrerTilstedevarelse(traeningId: number, tilstedevaelse: Array<{spillerId: number, tilstede: boolean}>) {
  try {
    console.log(`Registrerer tilstedeværelse for træning ID: ${traeningId} med ${tilstedevaelse.length} spillere`);
    
    // # Opret en transaktion for at sikre, at alle operationer enten gennemføres eller rulles tilbage
    await db.transaction(async (tx) => {
      // # For hver spiller i listen
      for (const { spillerId, tilstede } of tilstedevaelse) {
        // # Tjek om der allerede findes en registrering for denne spiller i denne træning
        const eksisterende = await tx
          .select()
          .from(traeningDeltager)
          .where(
            and(
              eq(traeningDeltager.traeningId, traeningId),
              eq(traeningDeltager.spillerId, spillerId)
            )
          );
        
        if (eksisterende.length > 0) {
          // # Opdater eksisterende registrering
          await tx
            .update(traeningDeltager)
            .set({
              tilstede,
              registreretDato: new Date(),
            })
            .where(
              and(
                eq(traeningDeltager.traeningId, traeningId),
                eq(traeningDeltager.spillerId, spillerId)
              )
            );
        } else {
          // # Opret ny registrering
          await tx
            .insert(traeningDeltager)
            .values({
              traeningId,
              spillerId,
              tilstede,
            });
        }
      }
    });
    
    console.log(`Tilstedeværelse registreret for træning ID: ${traeningId}`);
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved registrering af tilstedeværelse:", error);
    throw new Error(`Kunne ikke registrere tilstedeværelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle træninger for et specifikt hold
export async function hentTraeningerTilHold(holdId: number) {
  try {
    // # Hent alle træninger til holdet fra databasen, sorteret efter dato (nyeste først)
    console.log(`Henter træninger for hold ID: ${holdId}`);
    return await db.select().from(traeninger)
      .where(eq(traeninger.holdId, holdId))
      .orderBy(traeninger.dato);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af træninger for hold ID ${holdId}:`, error);
    throw new Error(`Kunne ikke hente træninger: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle træninger med flere hold
export async function hentAlleTræninger() {
  try {
    // # Hent alle træninger fra databasen, sorteret efter dato
    console.log("Henter alle træninger");
    return await db.select().from(traeninger)
      .orderBy(traeninger.dato);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved hentning af alle træninger:", error);
    throw new Error(`Kunne ikke hente træninger: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent hold der er tilmeldt en træning
export async function hentTilmeldteHold(traeningId: number) {
  try {
    // # Find først alle hold-IDs fra tilmeldingstabellen
    const holdTilmeldinger = await db
      .select({ holdId: traeningHold.holdId })
      .from(traeningHold)
      .where(eq(traeningHold.traeningId, traeningId));
    
    if (holdTilmeldinger.length === 0) {
      return [];
    }
    
    // # Udtræk alle holdIDs
    const holdIds = holdTilmeldinger.map(h => h.holdId);
    
    // # Hent hold-detaljer for alle de fundne hold-IDs
    return await db
      .select()
      .from(hold)
      .where(inArray(hold.id, holdIds))
      .orderBy(hold.navn);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af tilmeldte hold til træning ${traeningId}:`, error);
    throw new Error(`Kunne ikke hente tilmeldte hold: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle spillere fra de deltagende hold i en træning
export async function hentSpillereTilTraening(traeningId: number) {
  try {
    // # Hent først alle hold tilknyttet træningen
    const tilmeldteHold = await hentTilmeldteHold(traeningId);
    
    if (tilmeldteHold.length === 0) {
      return [];
    }
    
    // # Udtræk alle holdIDs
    const holdIds = tilmeldteHold.map(h => h.id);
    
    // # Hent alle spillere der er tilknyttet disse hold
    const alleSpillere = await db
      .select()
      .from(spillere)
      .where(inArray(spillere.holdId, holdIds))
      .orderBy(spillere.navn);
    
    // # Berig spillerne med information om deres hold
    const spillereMedHold = await Promise.all(
      alleSpillere.map(async (spiller) => {
        const holdInfo = tilmeldteHold.find(h => h.id === spiller.holdId);
        return {
          ...spiller,
          holdNavn: holdInfo ? holdInfo.navn : "Ukendt hold"
        };
      })
    );
    
    return spillereMedHold;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af spillere til træning ${traeningId}:`, error);
    throw new Error(`Kunne ikke hente spillere: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent tilstedeværelse for en træning
export async function hentTilstedevarelse(traeningId: number) {
  try {
    // # Hent alle registreringer for den givne træning
    return await db
      .select()
      .from(traeningDeltager)
      .where(eq(traeningDeltager.traeningId, traeningId));
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved hentning af tilstedeværelse for træning ${traeningId}:`, error);
    throw new Error(`Kunde ikke hente tilstedeværelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Øvelses-relaterede database funktioner

// # Opret ny øvelse
export async function opretOevelse(oevelseData: OevelseData) {
  // # Validér at navn ikke er tomt
  if (!oevelseData.navn || oevelseData.navn.trim() === "") {
    throw new Error("Øvelsesnavn må ikke være tomt");
  }

  // # Tjek om øvelsen bruger positioner eller minimumDeltagere
  if (oevelseData.brugerPositioner && (!oevelseData.positioner || oevelseData.positioner.length === 0) && (!oevelseData.variationer || oevelseData.variationer.length === 0)) {
    throw new Error("Øvelsen skal have enten positioner eller variationer, når 'brugerPositioner' er true");
  }

  if (!oevelseData.brugerPositioner && !oevelseData.minimumDeltagere) {
    throw new Error("Øvelsen skal have minimumDeltagere, når 'brugerPositioner' er false");
  }

  try {
    // # OPTIMERING: Brug én enkelt transaktion for alle operationer
    console.log(`Starter oprettelse af øvelse: ${oevelseData.navn}`);
    
    // # Find eller opret kategori hvis angivet
    let kategoriId: number | undefined = undefined;
    if (oevelseData.kategori && oevelseData.kategori.trim() !== "") {
      // # Tjek om kategorien allerede findes
      console.log(`Søger efter kategori: ${oevelseData.kategori}`);
      const eksisterendeKategori = await db.select({
          id: kategorier.id,
          navn: kategorier.navn
        })
        .from(kategorier)
        .where(eq(kategorier.navn, oevelseData.kategori));
      
      if (eksisterendeKategori.length > 0) {
        // # Brug eksisterende kategori
        kategoriId = eksisterendeKategori[0].id;
        console.log(`Bruger eksisterende kategori med ID: ${kategoriId}`);
      } else {
        // # Opret ny kategori
        console.log(`Opretter ny kategori: ${oevelseData.kategori}`);
        const nyKategori = await db.insert(kategorier).values({
          navn: oevelseData.kategori,
        }).returning({ id: kategorier.id });
        
        kategoriId = nyKategori[0].id;
        console.log(`Ny kategori oprettet med ID: ${kategoriId}`);
      }
    }
    
    // # Indsæt øvelse i databasen
    console.log(`Opretter øvelse med navn: ${oevelseData.navn}`);
    
    // # Forbered data til indsættelse
    const oevelseDataToDB: any = {
      navn: oevelseData.navn,
      brugerPositioner: oevelseData.brugerPositioner,
      minimumDeltagere: oevelseData.minimumDeltagere,
      kategoriId: kategoriId,
      originalPositionerNavn: oevelseData.originalPositionerNavn
    };
    
    // # Sæt beskrivelse kun hvis den findes og ikke er tom
    if (oevelseData.beskrivelse && oevelseData.beskrivelse.trim() !== "") {
      oevelseDataToDB.beskrivelse = oevelseData.beskrivelse;
    }
    
    // # Sæt billedeSti hvis det findes
    if (oevelseData.billedeSti) {
      oevelseDataToDB.billedeSti = oevelseData.billedeSti;
    }
    
    // # Indsæt øvelse i databasen
    const result = await db.insert(oevelser).values(oevelseDataToDB).returning({ id: oevelser.id });
    
    if (result.length === 0) {
      throw new Error("Kunne ikke oprette øvelse");
    }
    
    const oevelseId = result[0].id;
    console.log(`Øvelse oprettet med ID: ${oevelseId}`);
    
    // # Hvis øvelsen bruger positioner, opret dem
    if (oevelseData.brugerPositioner) {
      // # Håndter hovedpositioner hvis de findes
      if (oevelseData.positioner && oevelseData.positioner.length > 0) {
        console.log(`Tilføjer ${oevelseData.positioner.length} hovedpositioner til øvelsen`);
        
        // # Indsæt alle positioner i en enkelt forespørgsel
        await db.insert(oevelsePositioner).values(
          oevelseData.positioner.filter(p => p.antalKraevet > 0).map(position => ({
            oevelseId,
            variationId: null, // # Hovedpositioner har ingen variation
            position: position.position,
            antalKraevet: position.antalKraevet,
            erOffensiv: position.erOffensiv,
          }))
        );
      }
      
      // # Håndter variationer hvis de findes
      if (oevelseData.variationer && oevelseData.variationer.length > 0) {
        console.log(`Tilføjer ${oevelseData.variationer.length} variationer til øvelsen`);
        
        for (const variation of oevelseData.variationer) {
          // # Opret variation
          const variationResult = await db.insert(oevelseVariationer).values({
            oevelseId,
            navn: variation.navn,
            beskrivelse: variation.beskrivelse,
          }).returning({ id: oevelseVariationer.id });
          
          if (variationResult.length === 0) {
            throw new Error(`Kunne ikke oprette variation: ${variation.navn}`);
          }
          
          const variationId = variationResult[0].id;
          
          // # Opret positioner for variationen
          if (variation.positioner && variation.positioner.length > 0) {
            await db.insert(oevelsePositioner).values(
              variation.positioner.filter(p => p.antalKraevet > 0).map(position => ({
                oevelseId,
                variationId,
                position: position.position,
                antalKraevet: position.antalKraevet,
                erOffensiv: position.erOffensiv,
              }))
            );
          }
        }
      }
    }
    
    // # Håndter fokuspunkter hvis de er angivet
    if (oevelseData.fokuspunkter && oevelseData.fokuspunkter.trim() !== "") {
      // # Split fokuspunkterne ved linjeskift eller komma
      const fokuspunktListe = oevelseData.fokuspunkter.split(/[\n,]/).map(fp => fp.trim()).filter(fp => fp !== "");
      
      if (fokuspunktListe.length > 0) {
        console.log(`Behandler ${fokuspunktListe.length} fokuspunkter`);
        
        // # 1. Hent alle eksisterende fokuspunkter på én gang
        const alleFokuspunkter = await db.select({
            id: fokuspunkter.id,
            tekst: fokuspunkter.tekst
          })
          .from(fokuspunkter)
          .where(inArray(fokuspunkter.tekst, fokuspunktListe));
          
        // # Lav et map fra tekst til id for hurtig opslag
        const eksisterendeFokuspunkterMap = new Map(
          alleFokuspunkter.map(fp => [fp.tekst, fp.id])
        );
        
        // # 2. Find hvilke fokuspunkter der skal oprettes
        const nyeFokuspunkterTekst = fokuspunktListe.filter(
          tekst => !eksisterendeFokuspunkterMap.has(tekst)
        );
        
        // # 3. Opret nye fokuspunkter
        if (nyeFokuspunkterTekst.length > 0) {
          console.log(`Opretter ${nyeFokuspunkterTekst.length} nye fokuspunkter`);
          
          const nyeFokuspunkter = await db.insert(fokuspunkter)
            .values(nyeFokuspunkterTekst.map(tekst => ({ tekst })))
            .returning({ id: fokuspunkter.id, tekst: fokuspunkter.tekst });
            
            // # Tilføj nye fokuspunkter til map
            for (const fp of nyeFokuspunkter) {
              eksisterendeFokuspunkterMap.set(fp.tekst, fp.id);
            }
          }
          
          // # 4. Indsæt alle relationer på én gang
          const relationer = fokuspunktListe.map(tekst => ({
            oevelseId,
            fokuspunktId: eksisterendeFokuspunkterMap.get(tekst)!
          }));
          
          if (relationer.length > 0) {
            await db.insert(oevelseFokuspunkter).values(relationer);
          }
        }
      }
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/traening");
    
    // # Returner det oprettede øvelses ID
    return oevelseId;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved oprettelse af øvelse:", error);
    throw new Error(`Kunne ikke oprette øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle øvelser
export async function hentAlleOevelser() {
  try {
    // # Hent alle øvelser med deres kategorier
    console.log("Henter øvelser fra databasen");
    
    return await db
      .select({
        id: oevelser.id,
        navn: oevelser.navn,
        beskrivelse: oevelser.beskrivelse,
        billedeSti: oevelser.billedeSti,
        brugerPositioner: oevelser.brugerPositioner,
        minimumDeltagere: oevelser.minimumDeltagere,
        kategoriId: oevelser.kategoriId,
        kategoriNavn: kategorier.navn,
        oprettetDato: oevelser.oprettetDato,
      })
      .from(oevelser)
      .leftJoin(kategorier, eq(oevelser.kategoriId, kategorier.id))
      .orderBy(oevelser.oprettetDato);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved hentning af øvelser:", error);
    throw new Error(`Kunne ikke hente øvelser: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent specifik øvelse med ID
export async function hentOevelse(oevelseId: number) {
  console.log(`DEBUG: Henter øvelse med ID: ${oevelseId}`);
  
  try {
    // # Først henter vi grundlæggende øvelsesinformation
    const oevelse = await db.select().from(oevelser).where(eq(oevelser.id, oevelseId)).limit(1);

    if (!oevelse || oevelse.length === 0) {
      console.error(`Kunne ikke finde øvelse med ID: ${oevelseId}`);
      return null;
    }

    const oevelseData = oevelse[0];
    console.log(`DEBUG: Fandt øvelse: ${oevelseData.navn}`);

    // # Henter alle positioner for øvelsen
    const positionerListe = oevelseData.brugerPositioner 
      ? await db.select().from(oevelsePositioner)
          .where(eq(oevelsePositioner.oevelseId, oevelseId))
      : [];
    
    console.log(`DEBUG: Fandt ${positionerListe.length} positioner for øvelsen`);
    
    // # Henter variationer og deres positioner
    const variationer = await db.select().from(oevelseVariationer)
      .where(eq(oevelseVariationer.oevelseId, oevelseId));
    
    console.log(`DEBUG: Fandt ${variationer.length} variationer for øvelsen`);
    console.log(`DEBUG: Variationsdata:`, JSON.stringify(variationer, null, 2));
    
    // # For hver variation, hent dens positioner
    const variationerMedPositioner = await Promise.all(
      variationer.map(async (variation) => {
        const variationPositioner = await db.select()
          .from(oevelsePositioner)
          .where(and(
            eq(oevelsePositioner.oevelseId, oevelseId),
            eq(oevelsePositioner.variationId, variation.id)
          ));
        
        console.log(`DEBUG: Variation "${variation.navn}" har ${variationPositioner.length} positioner`);
        
        return {
          ...variation,
          positioner: variationPositioner
        };
      })
    );
    
    // # Henter kategori information hvis den har en kategori
    let kategoriData = null;
    if (oevelseData.kategoriId) {
      const kategoriResult = await db.select().from(kategorier).where(eq(kategorier.id, oevelseData.kategoriId)).limit(1);
      if (kategoriResult.length > 0) {
        kategoriData = kategoriResult[0];
      }
    }

    // # Henter fokuspunkter
    const fokuspunkterResult = await db.select({
      id: fokuspunkter.id,
      tekst: fokuspunkter.tekst
    })
    .from(oevelseFokuspunkter)
    .innerJoin(fokuspunkter, eq(oevelseFokuspunkter.fokuspunktId, fokuspunkter.id))
    .where(eq(oevelseFokuspunkter.oevelseId, oevelseId));

    // # Returnerer den samlede øvelsesdata
    return {
      ...oevelseData,
      kategori: kategoriData,
      positioner: positionerListe,
      variationer: variationerMedPositioner,
      fokuspunkter: fokuspunkterResult
    };
  } catch (error) {
    console.error('Fejl ved hentning af øvelse:', error);
    throw error;
  }
}

// # Hent alle kategorier
export async function hentAlleKategorier() {
  try {
    // # Hent alle kategorier sorteret efter navn
    return await db.select({
      id: kategorier.id,
      navn: kategorier.navn,
      oprettetDato: kategorier.oprettetDato
    })
    .from(kategorier)
    .orderBy(kategorier.navn);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved hentning af kategorier:", error);
    throw new Error(`Kunne ikke hente kategorier: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle fokuspunkter
export async function hentAlleFokuspunkter() {
  try {
    // # Hent alle fokuspunkter sorteret efter tekst
    return await db.select({
      id: fokuspunkter.id,
      tekst: fokuspunkter.tekst,
      oprettetDato: fokuspunkter.oprettetDato
    })
    .from(fokuspunkter)
    .orderBy(fokuspunkter.tekst);
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error("Fejl ved hentning af fokuspunkter:", error);
    throw new Error(`Kunne ikke hente fokuspunkter: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Slet en øvelse med det angivne ID
export async function sletOevelse(oevelseId: number) {
  try {
    console.log(`Forsøger at slette øvelse med ID: ${oevelseId}`);
    
    // # Slet øvelsen - relaterede data som fokuspunkter og positioner slettes automatisk pga. cascade
    const result = await db.delete(oevelser)
      .where(eq(oevelser.id, oevelseId))
      .returning({ id: oevelser.id });
    
    if (result.length === 0) {
      throw new Error(`Øvelse med ID ${oevelseId} findes ikke`);
    }
    
    console.log(`Øvelse med ID ${oevelseId} er blevet slettet`);
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/traening/oevelser");
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved sletning af øvelse med ID ${oevelseId}:`, error);
    throw new Error(`Kunne ikke slette øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opdater en eksisterende øvelse
export async function opdaterOevelse(oevelseId: number, oevelseData: OevelseData) {
  // # Validér at navn ikke er tomt
  if (!oevelseData.navn || oevelseData.navn.trim() === "") {
    throw new Error("Øvelsesnavn må ikke være tomt");
  }

  // # Tjek om øvelsen bruger positioner eller minimumDeltagere
  if (oevelseData.brugerPositioner && (!oevelseData.positioner || oevelseData.positioner.length === 0) && (!oevelseData.variationer || oevelseData.variationer.length === 0)) {
    throw new Error("Øvelsen skal have enten positioner eller variationer, når 'brugerPositioner' er true");
  }

  if (!oevelseData.brugerPositioner && !oevelseData.minimumDeltagere) {
    throw new Error("Øvelsen skal have minimumDeltagere, når 'brugerPositioner' er false");
  }

  try {
    console.log(`Opdaterer øvelse med ID: ${oevelseId}`);
    
    // # Find eller opret kategori hvis angivet
    let kategoriId: number | undefined = undefined;
    if (oevelseData.kategori && oevelseData.kategori.trim() !== "") {
      // # Tjek om kategorien allerede findes
      console.log(`Søger efter kategori: ${oevelseData.kategori}`);
      const eksisterendeKategori = await db.select({
          id: kategorier.id,
          navn: kategorier.navn
        })
        .from(kategorier)
        .where(eq(kategorier.navn, oevelseData.kategori));
      
      if (eksisterendeKategori.length > 0) {
        // # Brug eksisterende kategori
        kategoriId = eksisterendeKategori[0].id;
        console.log(`Bruger eksisterende kategori med ID: ${kategoriId}`);
      } else {
        // # Opret ny kategori
        console.log(`Opretter ny kategori: ${oevelseData.kategori}`);
        const nyKategori = await db.insert(kategorier).values({
          navn: oevelseData.kategori,
        }).returning({ id: kategorier.id });
        
        kategoriId = nyKategori[0].id;
        console.log(`Ny kategori oprettet med ID: ${kategoriId}`);
      }
    }
    
    // # Forbered data til opdatering
    const oevelseDataToDB: any = {
      navn: oevelseData.navn,
      brugerPositioner: oevelseData.brugerPositioner,
      minimumDeltagere: oevelseData.minimumDeltagere,
      kategoriId: kategoriId,
      originalPositionerNavn: oevelseData.originalPositionerNavn
    };
    
    // # Sæt beskrivelse kun hvis den findes og ikke er tom
    if (oevelseData.beskrivelse && oevelseData.beskrivelse.trim() !== "") {
      oevelseDataToDB.beskrivelse = oevelseData.beskrivelse;
    } else {
      oevelseDataToDB.beskrivelse = null; // # Nulstil beskrivelsen hvis tom
    }
    
    // # Sæt billedeSti hvis det findes
    if (oevelseData.billedeSti) {
      oevelseDataToDB.billedeSti = oevelseData.billedeSti;
    }
    
    // # Opdater øvelse i databasen
    const result = await db.update(oevelser)
      .set(oevelseDataToDB)
      .where(eq(oevelser.id, oevelseId))
      .returning({ id: oevelser.id });
      
    if (result.length === 0) {
      throw new Error(`Øvelse med ID ${oevelseId} findes ikke`);
    }

    try {
      // # Hvis øvelsen bruger positioner, håndter dem
      if (oevelseData.brugerPositioner) {
        // # Hent alle eksisterende positioner for øvelsen (uden variationer)
        const eksisterendePositioner = await db.select().from(oevelsePositioner)
          .where(and(
            eq(oevelsePositioner.oevelseId, oevelseId),
            isNull(oevelsePositioner.variationId)
          ));

        // # Find positioner der skal opdateres eller tilføjes
        const positionerAtOpdatere = oevelseData.positioner?.filter(p => p.antalKraevet > 0) || [];
        
        // # Find positioner der skal slettes (de som ikke længere er i brug)
        const positionerAtSlette = eksisterendePositioner.filter(ep => 
          !positionerAtOpdatere.some(p => p.position === ep.position)
        );

        // # Slet ubrugte positioner
        if (positionerAtSlette.length > 0) {
          await db.delete(oevelsePositioner)
            .where(and(
              eq(oevelsePositioner.oevelseId, oevelseId),
              isNull(oevelsePositioner.variationId),
              inArray(oevelsePositioner.position, positionerAtSlette.map(p => p.position))
            ));
        }

        // # Opdater eller tilføj positioner
        for (const position of positionerAtOpdatere) {
          const eksisterendePosition = eksisterendePositioner.find(ep => 
            ep.position === position.position
          );

          if (eksisterendePosition) {
            // # Opdater eksisterende position
            await db.update(oevelsePositioner)
              .set({ 
                antalKraevet: position.antalKraevet,
                erOffensiv: position.erOffensiv 
              })
              .where(and(
                eq(oevelsePositioner.oevelseId, oevelseId),
                isNull(oevelsePositioner.variationId),
                eq(oevelsePositioner.position, position.position)
              ));
          } else {
            // # Opret ny position
            await db.insert(oevelsePositioner).values({
              oevelseId,
              variationId: null,
              position: position.position,
              antalKraevet: position.antalKraevet,
              erOffensiv: position.erOffensiv,
            });
          }
        }

        // # Håndter variationer på samme måde
        if (oevelseData.variationer && oevelseData.variationer.length > 0) {
          for (const variation of oevelseData.variationer) {
            let variationId: number;

            // # Find eller opret variation
            const eksisterendeVariation = await db.select().from(oevelseVariationer)
              .where(and(
                eq(oevelseVariationer.oevelseId, oevelseId),
                eq(oevelseVariationer.navn, variation.navn)
              )).limit(1);

            if (eksisterendeVariation.length > 0) {
              variationId = eksisterendeVariation[0].id;
              // # Opdater variation hvis nødvendigt
              if (eksisterendeVariation[0].beskrivelse !== variation.beskrivelse) {
                await db.update(oevelseVariationer)
                  .set({ beskrivelse: variation.beskrivelse })
                  .where(eq(oevelseVariationer.id, variationId));
              }
            } else {
              const nyVariation = await db.insert(oevelseVariationer).values({
                oevelseId,
                navn: variation.navn,
                beskrivelse: variation.beskrivelse,
              }).returning({ id: oevelseVariationer.id });
              variationId = nyVariation[0].id;
            }

            // # Hent eksisterende positioner for denne variation
            const eksisterendeVariationPositioner = await db.select().from(oevelsePositioner)
              .where(and(
                eq(oevelsePositioner.oevelseId, oevelseId),
                eq(oevelsePositioner.variationId, variationId)
              ));

            // # Find positioner der skal opdateres eller tilføjes
            const variationPositionerAtOpdatere = variation.positioner.filter(p => p.antalKraevet > 0);

            // # Find positioner der skal slettes
            const variationPositionerAtSlette = eksisterendeVariationPositioner.filter(ep => 
              !variationPositionerAtOpdatere.some(p => p.position === ep.position)
            );

            // # Slet ubrugte positioner
            if (variationPositionerAtSlette.length > 0) {
              await db.delete(oevelsePositioner)
                .where(and(
                  eq(oevelsePositioner.oevelseId, oevelseId),
                  eq(oevelsePositioner.variationId, variationId),
                  inArray(oevelsePositioner.position, variationPositionerAtSlette.map(p => p.position))
                ));
            }

            // # Opdater eller tilføj positioner
            for (const position of variationPositionerAtOpdatere) {
              const eksisterendePosition = eksisterendeVariationPositioner.find(ep => 
                ep.position === position.position
              );

              if (eksisterendePosition) {
                // # Opdater eksisterende position
                await db.update(oevelsePositioner)
                  .set({ 
                    antalKraevet: position.antalKraevet,
                    erOffensiv: position.erOffensiv 
                  })
                  .where(and(
                    eq(oevelsePositioner.oevelseId, oevelseId),
                    eq(oevelsePositioner.variationId, variationId),
                    eq(oevelsePositioner.position, position.position)
                  ));
              } else {
                // # Opret ny position
                await db.insert(oevelsePositioner).values({
                  oevelseId,
                  variationId,
                  position: position.position,
                  antalKraevet: position.antalKraevet,
                  erOffensiv: position.erOffensiv,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Fejl ved håndtering af positioner for øvelse ${oevelseId}:`, error);
      throw error;
    }
    
    // # Håndter fokuspunkter, hvis de er angivet
    if (oevelseData.fokuspunkter !== undefined) {
      // # Slet alle eksisterende fokuspunkt-relationer
      await db.delete(oevelseFokuspunkter)
        .where(eq(oevelseFokuspunkter.oevelseId, oevelseId));
      
      // # Hvis der er angivet nye fokuspunkter, tilføj dem
      if (oevelseData.fokuspunkter && oevelseData.fokuspunkter.trim() !== "") {
        // # Split fokuspunkterne ved linjeskift eller komma
        const fokuspunktListe = oevelseData.fokuspunkter.split(/[\n,]/).map(fp => fp.trim()).filter(fp => fp !== "");
        
        if (fokuspunktListe.length > 0) {
          console.log(`Behandler ${fokuspunktListe.length} fokuspunkter til opdatering`);
          
          // # 1. Hent alle eksisterende fokuspunkter på én gang
          const alleFokuspunkter = await db.select({
              id: fokuspunkter.id,
              tekst: fokuspunkter.tekst
            })
            .from(fokuspunkter)
            .where(inArray(fokuspunkter.tekst, fokuspunktListe));
            
          // # Lav et map fra tekst til id for hurtig opslag
          const eksisterendeFokuspunkterMap = new Map(
            alleFokuspunkter.map(fp => [fp.tekst, fp.id])
          );
          
          // # 2. Find hvilke fokuspunkter der skal oprettes
          const nyeFokuspunkterTekst = fokuspunktListe.filter(
            tekst => !eksisterendeFokuspunkterMap.has(tekst)
          );
          
          // # 3. Opret nye fokuspunkter i en batch hvis der er nogen
          if (nyeFokuspunkterTekst.length > 0) {
            console.log(`Opretter ${nyeFokuspunkterTekst.length} nye fokuspunkter ved opdatering`);
            const nyeFokuspunkter = await db.insert(fokuspunkter)
              .values(nyeFokuspunkterTekst.map(tekst => ({ tekst })))
              .returning({ id: fokuspunkter.id, tekst: fokuspunkter.tekst });
              
            // # Opdater map med de nye fokuspunkter
            nyeFokuspunkter.forEach(fp => {
              eksisterendeFokuspunkterMap.set(fp.tekst, fp.id);
            });
          }
          
          // # 4. Indsæt alle relationer på én gang
          const relationer = fokuspunktListe.map(tekst => ({
            oevelseId,
            fokuspunktId: eksisterendeFokuspunkterMap.get(tekst)!
          }));
          
          if (relationer.length > 0) {
            await db.insert(oevelseFokuspunkter).values(relationer);
          }
        }
      }
    }
    
    // # Revalidér stien så siden opdateres
    revalidatePath("/traening/oevelser");
    
    return oevelseId;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved opdatering af øvelse med ID ${oevelseId}:`, error);
    throw new Error(`Kunne ikke opdatere øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent alle positioner (både offensive og defensive)
export async function hentAllePositioner() {
  try {
    // # Returner en samlet liste af alle positioner
    return {
      offensive: OFFENSIVE_POSITIONER,
      defensive: DEFENSIVE_POSITIONER
    };
  } catch (error) {
    console.error("Fejl ved hentning af positioner:", error);
    throw new Error(`Kunne ikke hente positioner: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent fokuspunkter for en specifik øvelse
export async function hentOevelseFokuspunkter(oevelseId: number) {
  try {
    console.log(`Henter fokuspunkter for øvelse ID: ${oevelseId}`);
    
    // # Hent fokuspunkter for øvelsen
    const fokuspunkterResult = await db.select({
      id: fokuspunkter.id,
      tekst: fokuspunkter.tekst
    })
    .from(oevelseFokuspunkter)
    .innerJoin(fokuspunkter, eq(oevelseFokuspunkter.fokuspunktId, fokuspunkter.id))
    .where(eq(oevelseFokuspunkter.oevelseId, oevelseId));
    
    return fokuspunkterResult;
  } catch (error) {
    console.error(`Fejl ved hentning af fokuspunkter for øvelse ID: ${oevelseId}:`, error);
    throw new Error(`Kunne ikke hente fokuspunkter for øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opret nyt fokuspunkt i databasen
export async function opretFokuspunkt(tekst: string) {
  try {
    console.log(`Forsøger at oprette nyt fokuspunkt: ${tekst}`);
    
    // # Tjek om fokuspunktet allerede findes
    const eksisterendeFokuspunkt = await db.select({
        id: fokuspunkter.id,
        tekst: fokuspunkter.tekst
      })
      .from(fokuspunkter)
      .where(eq(fokuspunkter.tekst, tekst))
      .limit(1);
    
    // # Hvis fokuspunktet allerede findes, returner det eksisterende
    if (eksisterendeFokuspunkt.length > 0) {
      console.log(`Fokuspunkt '${tekst}' findes allerede med ID: ${eksisterendeFokuspunkt[0].id}`);
      return {
        id: eksisterendeFokuspunkt[0].id,
        tekst: eksisterendeFokuspunkt[0].tekst,
        nyOprettet: false
      };
    }
    
    // # Opret nyt fokuspunkt
    console.log(`Opretter nyt fokuspunkt: ${tekst}`);
    const nytFokuspunkt = await db.insert(fokuspunkter)
      .values({ tekst })
      .returning({ id: fokuspunkter.id, tekst: fokuspunkter.tekst });
    
    console.log(`Nyt fokuspunkt oprettet med ID: ${nytFokuspunkt[0].id}`);
    
    return {
      id: nytFokuspunkt[0].id,
      tekst: nytFokuspunkt[0].tekst,
      nyOprettet: true
    };
  } catch (error) {
    console.error(`Fejl ved oprettelse af fokuspunkt '${tekst}':`, error);
    throw new Error(`Kunne ikke oprette fokuspunkt: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opret ny kategori i databasen
export async function opretKategori(navn: string) {
  try {
    console.log(`Forsøger at oprette ny kategori: ${navn}`);
    
    // # Tjek om kategorien allerede findes
    const eksisterendeKategori = await db.select({
        id: kategorier.id,
        navn: kategorier.navn
      })
      .from(kategorier)
      .where(eq(kategorier.navn, navn))
      .limit(1);
    
    // # Hvis kategorien allerede findes, returner den eksisterende
    if (eksisterendeKategori.length > 0) {
      console.log(`Kategori '${navn}' findes allerede med ID: ${eksisterendeKategori[0].id}`);
      return {
        id: eksisterendeKategori[0].id,
        navn: eksisterendeKategori[0].navn,
        nyOprettet: false
      };
    }
    
    // # Opret ny kategori
    console.log(`Opretter ny kategori: ${navn}`);
    const nyKategori = await db.insert(kategorier)
      .values({ navn })
      .returning({ id: kategorier.id, navn: kategorier.navn });
    
    console.log(`Ny kategori oprettet med ID: ${nyKategori[0].id}`);
    
    return {
      id: nyKategori[0].id,
      navn: nyKategori[0].navn,
      nyOprettet: true
    };
  } catch (error) {
    console.error(`Fejl ved oprettelse af kategori '${navn}':`, error);
    throw new Error(`Kunne ikke oprette kategori: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Tilføj deltagere til en øvelse i en træning
export async function tilfoejDeltagereOevelse(traeningOevelseId: number, spillerIds: number[]) {
  try {
    console.log(`Tilføjer ${spillerIds.length} deltagere til træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Opret en transaktion for at sikre, at alle operationer enten gennemføres eller rulles tilbage
    await db.transaction(async (tx) => {
      // # For hver spiller i listen
      for (const spillerId of spillerIds) {
        // # Indsæt relation i databasen
        await tx
          .insert(traeningOevelseDeltagere)
          .values({
            traeningOevelseId,
            spillerId,
          })
          .onConflictDoNothing(); // # Ignorer hvis relationen allerede eksisterer
      }
    });
    
    console.log(`Deltagere tilføjet til træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved tilføjelse af deltagere til øvelse:", error);
    throw new Error(`Kunne ikke tilføje deltagere til øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Fjern deltagere fra en øvelse i en træning
export async function fjernDeltagereOevelse(traeningOevelseId: number, spillerIds: number[]) {
  try {
    console.log(`Fjerner ${spillerIds.length} deltagere fra træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Opret en transaktion for at sikre, at alle operationer enten gennemføres eller rulles tilbage
    await db.transaction(async (tx) => {
      // # For hver spiller i listen
      for (const spillerId of spillerIds) {
        // # Slet relation fra databasen
        await tx
          .delete(traeningOevelseDeltagere)
          .where(
            and(
              eq(traeningOevelseDeltagere.traeningOevelseId, traeningOevelseId),
              eq(traeningOevelseDeltagere.spillerId, spillerId)
            )
          );
      }
    });
    
    console.log(`Deltagere fjernet fra træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved fjernelse af deltagere fra øvelse:", error);
    throw new Error(`Kunne ikke fjerne deltagere fra øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent deltagere for en øvelse i en træning
export async function hentOevelseDeltagere(traeningOevelseId: number) {
  try {
    console.log(`Henter deltagere for træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent alle deltagere for øvelsen med deres detaljer
    const deltagere = await db
      .select({
        spillerId: traeningOevelseDeltagere.spillerId,
        navn: spillere.navn,
        nummer: spillere.nummer,
        erMV: spillere.erMV,
        holdId: spillere.holdId,
        holdNavn: hold.navn,
      })
      .from(traeningOevelseDeltagere)
      .innerJoin(spillere, eq(traeningOevelseDeltagere.spillerId, spillere.id))
      .innerJoin(hold, eq(spillere.holdId, hold.id))
      .where(eq(traeningOevelseDeltagere.traeningOevelseId, traeningOevelseId))
      .orderBy(spillere.navn);
    
    console.log(`Fandt ${deltagere.length} deltagere for træningsøvelse ID: ${traeningOevelseId}`);
    
    return deltagere;
  } catch (error) {
    console.error("Fejl ved hentning af deltagere for øvelse:", error);
    throw new Error(`Kunne ikke hente deltagere for øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Tilføj alle tilstedeværende deltagere til en øvelse i en træning
export async function tilfoejAlleTilstedevaerende(traeningOevelseId: number, traeningId: number) {
  try {
    console.log(`Tilføjer alle tilstedeværende deltagere til træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent alle tilstedeværende spillere for træningen
    const tilstedevaerende = await db
      .select({
        spillerId: traeningDeltager.spillerId,
      })
      .from(traeningDeltager)
      .where(
        and(
          eq(traeningDeltager.traeningId, traeningId),
          eq(traeningDeltager.tilstede, true)
        )
      );
    
    // # Hvis der ikke er nogen tilstedeværende, returner tidligt
    if (tilstedevaerende.length === 0) {
      console.log(`Ingen tilstedeværende deltagere fundet for træning ID: ${traeningId}`);
      return { success: true, count: 0 };
    }
    
    // # Tilføj alle tilstedeværende til øvelsen
    await tilfoejDeltagereOevelse(
      traeningOevelseId, 
      tilstedevaerende.map(t => t.spillerId)
    );
    
    console.log(`Tilføjet ${tilstedevaerende.length} tilstedeværende deltagere til træningsøvelse ID: ${traeningOevelseId}`);
    
    return { success: true, count: tilstedevaerende.length };
  } catch (error) {
    console.error("Fejl ved tilføjelse af alle tilstedeværende til øvelse:", error);
    throw new Error(`Kunne ikke tilføje alle tilstedeværende til øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Fjern alle deltagere fra en øvelse i en træning
export async function fjernAlleDeltagere(traeningOevelseId: number) {
  try {
    console.log(`Fjerner alle deltagere fra træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Slet alle relationer fra databasen
    const result = await db
      .delete(traeningOevelseDeltagere)
      .where(eq(traeningOevelseDeltagere.traeningOevelseId, traeningOevelseId))
      .returning({ spillerId: traeningOevelseDeltagere.spillerId });
    
    console.log(`Fjernet ${result.length} deltagere fra træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    return { success: true, count: result.length };
  } catch (error) {
    console.error("Fejl ved fjernelse af alle deltagere fra øvelse:", error);
    throw new Error(`Kunne ikke fjerne alle deltagere fra øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Tildel position til en spiller i en træningsøvelse
export async function tildelPositionTilSpiller(
  traeningOevelseId: number,
  spillerId: number,
  position: string,
  erOffensiv: boolean,
  variationId?: number
) {
  try {
    console.log(`Tildeler position ${position} til spiller ID: ${spillerId} i træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Tjek først om spilleren er deltager i denne øvelse
    const erDeltager = await db
      .select()
      .from(traeningOevelseDeltagere)
      .where(
        and(
          eq(traeningOevelseDeltagere.traeningOevelseId, traeningOevelseId),
          eq(traeningOevelseDeltagere.spillerId, spillerId)
        )
      )
      .limit(1);
    
    // # Hvis spilleren ikke allerede er deltager i øvelsen, så tilføj dem først
    if (erDeltager.length === 0) {
      console.log(`Spiller ID: ${spillerId} er ikke deltager i øvelsen. Tilføjer som deltager...`);
      await tilfoejDeltagereOevelse(traeningOevelseId, [spillerId]);
    }
    
    // # Fjern først eventuelle eksisterende positioner af samme type (offensiv/defensiv)
    // # Dette sikrer at en spiller ikke har flere offensive/defensive positioner på samme tid
    await db
      .delete(traeningOevelseSpillerPositioner)
      .where(
        and(
          eq(traeningOevelseSpillerPositioner.traeningOevelseId, traeningOevelseId),
          eq(traeningOevelseSpillerPositioner.spillerId, spillerId),
          eq(traeningOevelseSpillerPositioner.erOffensiv, erOffensiv),
          variationId !== undefined 
            ? eq(traeningOevelseSpillerPositioner.variationId, variationId)
            : isNull(traeningOevelseSpillerPositioner.variationId)
        )
      );
    
    // # Indsæt den nye position
    await db
      .insert(traeningOevelseSpillerPositioner)
      .values({
        traeningOevelseId,
        spillerId,
        position,
        erOffensiv,
        variationId: variationId ?? null,
      });
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    console.log(`Position ${position} tildelt til spiller ID: ${spillerId} i træningsøvelse ID: ${traeningOevelseId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved tildeling af position til spiller:", error);
    throw new Error(`Kunne ikke tildele position til spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Fjern position fra en spiller i en træningsøvelse
export async function fjernPositionFraSpiller(
  traeningOevelseId: number,
  spillerId: number,
  position: string,
  variationId?: number
) {
  try {
    console.log(`Fjerner position ${position} fra spiller ID: ${spillerId} i træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Slet positionen fra databasen
    await db
      .delete(traeningOevelseSpillerPositioner)
      .where(
        and(
          eq(traeningOevelseSpillerPositioner.traeningOevelseId, traeningOevelseId),
          eq(traeningOevelseSpillerPositioner.spillerId, spillerId),
          eq(traeningOevelseSpillerPositioner.position, position),
          variationId !== undefined 
            ? eq(traeningOevelseSpillerPositioner.variationId, variationId)
            : isNull(traeningOevelseSpillerPositioner.variationId)
        )
      );
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    console.log(`Position ${position} fjernet fra spiller ID: ${spillerId} i træningsøvelse ID: ${traeningOevelseId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved fjernelse af position fra spiller:", error);
    throw new Error(`Kunne ikke fjerne position fra spiller: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Fjern alle positioner fra spillere i en træningsøvelse
export async function fjernAllePositionerFraOevelse(
  traeningOevelseId: number,
  variationId?: number
) {
  try {
    console.log(`Fjerner alle positioner fra træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Opbyg WHERE betingelsen
    const whereBetingelse = variationId !== undefined
      ? and(
          eq(traeningOevelseSpillerPositioner.traeningOevelseId, traeningOevelseId),
          eq(traeningOevelseSpillerPositioner.variationId, variationId)
        )
      : and(
          eq(traeningOevelseSpillerPositioner.traeningOevelseId, traeningOevelseId),
          isNull(traeningOevelseSpillerPositioner.variationId)
        );
    
    // # Slet alle positioner fra databasen
    const result = await db
      .delete(traeningOevelseSpillerPositioner)
      .where(whereBetingelse)
      .returning({ 
        spillerId: traeningOevelseSpillerPositioner.spillerId,
        position: traeningOevelseSpillerPositioner.position
      });
    
    // # Hent træningsID for at kunne revalidere stien
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length > 0) {
      // # Revalidér stien så siden opdateres
      revalidatePath(`/traening/faelles/${trainingExercise[0].traeningId}`);
    }
    
    console.log(`Fjernet ${result.length} positioner fra træningsøvelse ID: ${traeningOevelseId}`);
    
    return { success: true, count: result.length };
  } catch (error) {
    console.error("Fejl ved fjernelse af alle positioner fra træningsøvelse:", error);
    throw new Error(`Kunne ikke fjerne alle positioner fra træningsøvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent positioner for en træningsøvelse
export async function hentOevelseSpillerPositioner(traeningOevelseId: number, variationId?: number) {
  try {
    console.log(`Henter spillerpositioner for træningsøvelse ID: ${traeningOevelseId}`);
    
    let query = db
      .select({
        traeningOevelseId: traeningOevelseSpillerPositioner.traeningOevelseId,
        spillerId: traeningOevelseSpillerPositioner.spillerId,
        position: traeningOevelseSpillerPositioner.position,
        erOffensiv: traeningOevelseSpillerPositioner.erOffensiv,
        variationId: traeningOevelseSpillerPositioner.variationId,
        navn: spillere.navn,
        nummer: spillere.nummer,
        erMV: spillere.erMV,
        holdId: spillere.holdId,
        holdNavn: hold.navn,
      })
      .from(traeningOevelseSpillerPositioner)
      .innerJoin(spillere, eq(traeningOevelseSpillerPositioner.spillerId, spillere.id))
      .innerJoin(hold, eq(spillere.holdId, hold.id))
      .where(
        and(
          eq(traeningOevelseSpillerPositioner.traeningOevelseId, traeningOevelseId),
          variationId !== undefined 
            ? eq(traeningOevelseSpillerPositioner.variationId, variationId)
            : isNull(traeningOevelseSpillerPositioner.variationId)
        )
      );
    
    const positioner = await query.orderBy(spillere.navn);
    
    console.log(`Fandt ${positioner.length} spillerpositioner for træningsøvelse ID: ${traeningOevelseId}`);
    
    return positioner;
  } catch (error) {
    console.error("Fejl ved hentning af spillerpositioner for øvelse:", error);
    throw new Error(`Kunne ikke hente spillerpositioner for øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent positionskrav for en øvelse
export async function hentOevelsePositionskrav(oevelseId: number, variationId?: number) {
  try {
    console.log(`DEBUG: Henter positionskrav for øvelse ID: ${oevelseId}, variationId: ${variationId || 'null'}`);
    
    let query = db
      .select({
        oevelseId: oevelsePositioner.oevelseId,
        variationId: oevelsePositioner.variationId,
        position: oevelsePositioner.position,
        antalKraevet: oevelsePositioner.antalKraevet,
        erOffensiv: oevelsePositioner.erOffensiv,
      })
      .from(oevelsePositioner)
      .where(
        and(
          eq(oevelsePositioner.oevelseId, oevelseId),
          variationId !== undefined 
            ? eq(oevelsePositioner.variationId, variationId)
            : isNull(oevelsePositioner.variationId)
        )
      );
    
    const positionskrav = await query;
    
    console.log(`DEBUG: Fandt ${positionskrav.length} positionskrav for øvelse ID: ${oevelseId} med variationId: ${variationId || 'null'}`);
    console.log(`DEBUG: Positions data:`, JSON.stringify(positionskrav, null, 2));
    
    return positionskrav;
  } catch (error) {
    console.error("Fejl ved hentning af positionskrav for øvelse:", error);
    throw new Error(`Kunne ikke hente positionskrav for øvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hjælpefunktion til at hente foreslåede spillere til positioner baseret på primære og sekundære præferencer
export async function hentForeslaaedeSpillere(deltagere: any[], traeningOevelseId: number, variationId?: number) {
  try {
    // # Log operation
    console.log(`Henter foreslåede spillere for træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hvis der ikke er nogen deltagere, returner tom array
    if (!deltagere || deltagere.length === 0) {
      return [];
    }

    // # Hent alle nuværende spillerpositioner for øvelsen
    const nuværendePositioner = await hentOevelseSpillerPositioner(traeningOevelseId, variationId);
    
    // # Find spillere der ikke allerede har en position
    const spillereUdenPositioner = deltagere.filter(deltager => 
      !nuværendePositioner.some(pos => pos.spillerId === deltager.spillerId)
    );
    
    // # Resultat array med positionsforslag
    const positionsforslag: any[] = [];
    
    // # Få alle spillere med deres foretrukne positioner
    await Promise.all(
      spillereUdenPositioner.map(async (deltager) => {
        // # Skip målvogtere i denne kontekst
        if (deltager.erMV) {
          return;
        }
        
        const spiller = await hentSpiller(deltager.spillerId);
        
        if (!spiller) {
          return;
        }
        
        // # Håndter offensive positioner
        spiller.offensivePositioner.forEach(p => {
          positionsforslag.push({
            spillerId: deltager.spillerId,
            navn: deltager.navn, 
            nummer: deltager.nummer,
            holdId: deltager.holdId,
            holdNavn: deltager.holdNavn,
            erMV: deltager.erMV,
            position: p.position,
            erOffensiv: true,
            erPrimaer: p.erPrimaer
          });
        });
        
        // # Håndter defensive positioner
        spiller.defensivePositioner.forEach(p => {
          positionsforslag.push({
            spillerId: deltager.spillerId,
            navn: deltager.navn,
            nummer: deltager.nummer,
            holdId: deltager.holdId,
            holdNavn: deltager.holdNavn,
            erMV: deltager.erMV,
            position: p.position,
            erOffensiv: false,
            erPrimaer: p.erPrimaer
          });
        });
      })
    );
    
    // # Returner positonsforslag sorteret efter primære positioner først
    return positionsforslag.sort((a, b) => {
      // # Sorter først efter primær/sekundær position
      if (a.erPrimaer && !b.erPrimaer) return -1;
      if (!a.erPrimaer && b.erPrimaer) return 1;
      
      // # Derefter sort efter navn for bedre overblik
      return a.navn.localeCompare(b.navn);
    });
  } catch (error) {
    console.error("Fejl ved hentning af foreslåede spillere:", error);
    throw new Error(`Kunne ikke hente foreslåede spillere: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

/**
 * Henter foreslåede spillere baseret på deres foretrukne positioner.
 * @param deltagere - Liste af deltagere i træningsøvelsen
 * @param trainingExerciseId - ID for træningsøvelsen
 * @param variationId - ID for variationen (valgfri)
 * @returns Liste af foreslåede spillere med deres positioner
 */
export async function hentForeslaaedeSpillereV2(
  deltagere: { spillerId: number }[],
  trainingExerciseId: number,
  variationId?: number
) {
  try {
    console.log(`Henter foreslåede spillere for træningsøvelse ID: ${trainingExerciseId}`);
    
    // # Hvis der ikke er nogen deltagere, returner en tom liste
    if (!deltagere || deltagere.length === 0) {
      console.log(`Ingen deltagere fundet for træningsøvelse ID: ${trainingExerciseId}`);
      return [];
    }
    
    // # Hent spillerpositioner som allerede er tildelt i øvelsen
    const spillerPositioner = await db.select({
      spillerId: traeningOevelseSpillerPositioner.spillerId
    })
    .from(traeningOevelseSpillerPositioner)
    .where(
      and(
        eq(traeningOevelseSpillerPositioner.traeningOevelseId, trainingExerciseId),
        variationId ? eq(traeningOevelseSpillerPositioner.variationId, variationId) : isNull(traeningOevelseSpillerPositioner.variationId)
      )
    );
    
    console.log(`Fandt ${spillerPositioner.length} spillerpositioner for træningsøvelse ID: ${trainingExerciseId}`);
    
    // # Find spillere uden positioner som kan foreslås
    const spillereUdenPositioner = deltagere.filter(deltager => 
      !spillerPositioner.some(sp => sp.spillerId === deltager.spillerId)
    );
    
    // # Opret array til at gemme resultater
    const positionsforslag: Array<{
      spillerId: number;
      navn: string;
      position: string;
      erOffensiv: boolean;
      erPrimaer: boolean;
      nummer?: number;
    }> = [];
    
    // # Hent foretrukne positioner for hver spiller
    for (const deltager of spillereUdenPositioner) {
      const spiller = await hentSpiller(deltager.spillerId);
      
      // # Hvis spilleren ikke findes, spring over
      if (!spiller) continue;
      
      // # Hvis det er en målmand, foreslår vi ikke positioner
      if (spiller.erMV) {
        continue;
      }
      
      // # Hent offensive primære positioner
      const primOffPositioner = await db.select()
        .from(offensivePositioner)
        .where(
          and(
            eq(offensivePositioner.spillerId, spiller.id),
            eq(offensivePositioner.erPrimaer, true)
          )
        );
      
      // # Offensive primære positioner
      for (const pos of primOffPositioner) {
        positionsforslag.push({
          spillerId: spiller.id,
          navn: spiller.navn + (spiller.nummer ? ` #${spiller.nummer}` : ''),
          position: pos.position,
          erOffensiv: true,
          erPrimaer: true,
          nummer: spiller.nummer || undefined
        });
      }
      
      // # Defensive primære positioner
      const primDefPositioner = await db.select()
        .from(defensivePositioner)
        .where(
          and(
            eq(defensivePositioner.spillerId, spiller.id),
            eq(defensivePositioner.erPrimaer, true)
          )
        );
      
      for (const pos of primDefPositioner) {
        positionsforslag.push({
          spillerId: spiller.id,
          navn: spiller.navn + (spiller.nummer ? ` #${spiller.nummer}` : ''),
          position: pos.position,
          erOffensiv: false,
          erPrimaer: true,
          nummer: spiller.nummer || undefined
        });
      }
      
      // # Sekundære offensive positioner
      const sekOffPositioner = await db.select()
        .from(offensivePositioner)
        .where(
          and(
            eq(offensivePositioner.spillerId, spiller.id),
            eq(offensivePositioner.erPrimaer, false)
          )
        );
      
      for (const pos of sekOffPositioner) {
        positionsforslag.push({
          spillerId: spiller.id,
          navn: spiller.navn + (spiller.nummer ? ` #${spiller.nummer}` : ''),
          position: pos.position,
          erOffensiv: true,
          erPrimaer: false,
          nummer: spiller.nummer || undefined
        });
      }
      
      // # Sekundære defensive positioner
      const sekDefPositioner = await db.select()
        .from(defensivePositioner)
        .where(
          and(
            eq(defensivePositioner.spillerId, spiller.id),
            eq(defensivePositioner.erPrimaer, false)
          )
        );
      
      for (const pos of sekDefPositioner) {
        positionsforslag.push({
          spillerId: spiller.id,
          navn: spiller.navn + (spiller.nummer ? ` #${spiller.nummer}` : ''),
          position: pos.position,
          erOffensiv: false,
          erPrimaer: false,
          nummer: spiller.nummer || undefined
        });
      }
    }
    
    // # Sorter resultaterne: primær først, derefter efter navn
    positionsforslag.sort((a, b) => {
      // # Sorter primær før sekundær
      if (a.erPrimaer !== b.erPrimaer) {
        return a.erPrimaer ? -1 : 1;
      }
      // # Derefter efter navn
      return a.navn.localeCompare(b.navn);
    });
    
    return positionsforslag;
  } catch (error) {
    console.error("Fejl ved hentning af foreslåede spillere:", error);
    throw new Error("Kunne ikke hente foreslåede spillere");
  }
}
