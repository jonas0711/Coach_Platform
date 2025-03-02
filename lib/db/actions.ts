"use server";

import { db, hold, spillere, offensivePositioner, defensivePositioner } from "./index";
import { eq, and } from "drizzle-orm";
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