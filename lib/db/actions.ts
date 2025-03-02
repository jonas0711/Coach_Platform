"use server";

import { db, hold, spillere, offensivePositioner, defensivePositioner, traeninger, traeningHold, traeningDeltager } from "./index";
import { eq, and, inArray } from "drizzle-orm";
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
    console.log(`Henter hold med ID: ${id}`);
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

// # Opret ny spiller til et specifikt hold
export async function opretSpiller(holdId: number, spillerData: SpillerData) {
  // # Validér at navn ikke er tomt
  if (!spillerData.navn || spillerData.navn.trim() === "") {
    throw new Error("Spillernavn må ikke være tomt");
  }

  // # Validér at målvogtere ikke har positioner
  if (spillerData.erMV) {
    // # Hvis spilleren er målvogter, skal de ikke have positioner
    spillerData.offensivePositioner = [];
    spillerData.defensivePositioner = [];
  } else {
    // # Validér offensive positioner (skal have præcis én primær)
    if (!spillerData.erMV) {
      const primærOffensiv = spillerData.offensivePositioner.filter(p => p.erPrimaer);
      if (primærOffensiv.length !== 1) {
        throw new Error("Spilleren skal have præcis én primær offensiv position");
      }
    }

    // # Validér defensive positioner (skal have 1-2 primære)
    if (!spillerData.erMV) {
      const primærDefensiv = spillerData.defensivePositioner.filter(p => p.erPrimaer);
      if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
        throw new Error("Spilleren skal have 1-2 primære defensive positioner");
      }
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

  // # Hent spilleren først for at få holdId til sti-revalidering
  const eksisterendeSpiller = await db.select().from(spillere).where(eq(spillere.id, spillerId));
  if (eksisterendeSpiller.length === 0) {
    throw new Error("Spilleren findes ikke");
  }
  const holdId = eksisterendeSpiller[0].holdId;

  // # Validér at målvogtere ikke har positioner
  if (spillerData.erMV) {
    // # Hvis spilleren er målvogter, skal de ikke have positioner
    spillerData.offensivePositioner = [];
    spillerData.defensivePositioner = [];
  } else {
    // # Validér offensive positioner (skal have præcis én primær)
    if (!spillerData.erMV) {
      const primærOffensiv = spillerData.offensivePositioner.filter(p => p.erPrimaer);
      if (primærOffensiv.length !== 1) {
        throw new Error("Spilleren skal have præcis én primær offensiv position");
      }
    }

    // # Validér defensive positioner (skal have 1-2 primære)
    if (!spillerData.erMV) {
      const primærDefensiv = spillerData.defensivePositioner.filter(p => p.erPrimaer);
      if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
        throw new Error("Spilleren skal have 1-2 primære defensive positioner");
      }
    }
  }

  try {
    console.log(`Opdaterer spiller med ID: ${spillerId}`);
    
    // # Opdater spillerens basale data
    await db.update(spillere).set({
      navn: spillerData.navn,
      nummer: spillerData.nummer,
      erMV: spillerData.erMV,
    }).where(eq(spillere.id, spillerId));
    
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
    console.error(`Fejl ved opdatering af spiller med ID ${spillerId}:`, error);
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
  // # Sæt flereTilmeldte flag til true
  return opretTraening({
    ...traeningData,
    flereTilmeldte: true
  });
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
    // # Først fjern alle eksisterende tilstedeværelsesregistreringer
    console.log(`Fjerner eksisterende tilstedeværelse for træning ID: ${traeningId}`);
    await db.delete(traeningDeltager).where(eq(traeningDeltager.traeningId, traeningId));
    
    // # Derefter tilføj de nye registreringer
    console.log(`Registrerer tilstedeværelse for ${tilstedevaelse.length} spillere ved træning ID: ${traeningId}`);
    
    for (const { spillerId, tilstede } of tilstedevaelse) {
      await db.insert(traeningDeltager).values({
        traeningId,
        spillerId,
        tilstede,
      });
    }
    
    // # Revalidér stien så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
    return true;
  } catch (error) {
    // # Log fejl og videregiv den til kalderen
    console.error(`Fejl ved registrering af tilstedeværelse for træning ID ${traeningId}:`, error);
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