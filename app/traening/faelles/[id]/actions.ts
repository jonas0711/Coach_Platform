"use server";

import { 
  db, 
  traeninger, 
  traeningOevelser, 
  oevelser, 
  traeningOevelseDetaljer, 
  traeningOevelseFokuspunkter,
  traeningOevelseDeltagere,
  traeningDeltager,
  spillere,
  hold,
  kategorier,
  fokuspunkter
} from "@/lib/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { opretFokuspunkt, opretKategori, hentOevelseFokuspunkter, tilfoejDeltagereOevelse, fjernDeltagereOevelse, hentOevelseDeltagere, tilfoejAlleTilstedevaerende, fjernAlleDeltagere, tildelPositionTilSpiller, fjernPositionFraSpiller, fjernAllePositionerFraOevelse, hentOevelseSpillerPositioner, hentOevelsePositionskrav, hentForeslaaedeSpillereV2 } from "@/lib/db/actions";

// # Interface for at tilføje en øvelse til en træning
export interface TraeningOevelseData {
  traeningId: number;
  oevelseId: number;
  position?: number; // # Hvis ikke angivet, tilføjes den sidst
}

// # Hent alle øvelser tilknyttet til en træning med deres detaljer
export async function hentTraeningOevelser(traeningId: number) {
  try {
    console.log(`Henter øvelser for træning ID: ${traeningId}`);
    
    // # Hent alle øvelser for træningen med deres basis-detaljer
    // # (uden at forsøge at joine med de nye tabeller, som måske ikke eksisterer endnu)
    try {
      // # Forsøg først med de nye tabeller (inkluderer lokale ændringer)
      const trainingExercises = await db
        .select({
          id: traeningOevelser.id,
          traeningId: traeningOevelser.traeningId,
          oevelseId: traeningOevelser.oevelseId,
          position: traeningOevelser.position,
          detaljeId: traeningOevelseDetaljer.id,
          lokaltNavn: traeningOevelseDetaljer.navn,
          lokalBeskrivelse: traeningOevelseDetaljer.beskrivelse,
          lokalKategoriNavn: traeningOevelseDetaljer.kategoriNavn,
          oevelse: {
            id: oevelser.id,
            navn: oevelser.navn,
            beskrivelse: oevelser.beskrivelse,
            billedeSti: oevelser.billedeSti,
            brugerPositioner: oevelser.brugerPositioner,
            minimumDeltagere: oevelser.minimumDeltagere,
            kategoriNavn: kategorier.navn,
          },
        })
        .from(traeningOevelser)
        .leftJoin(oevelser, eq(traeningOevelser.oevelseId, oevelser.id))
        .leftJoin(kategorier, eq(oevelser.kategoriId, kategorier.id))
        .leftJoin(traeningOevelseDetaljer, eq(traeningOevelseDetaljer.traeningOevelseId, traeningOevelser.id))
        .where(eq(traeningOevelser.traeningId, traeningId))
        .orderBy(traeningOevelser.position);
      
      // # Transformér resultatet for at anvende lokale ændringer hvor de findes
      const transformedExercises = trainingExercises.map(exercise => {
        // # Hvis der findes lokale ændringer, brug dem i stedet for de originale værdier
        const transformedExercise = {
          id: exercise.id,
          traeningId: exercise.traeningId,
          oevelseId: exercise.oevelseId,
          position: exercise.position,
          oevelse: {
            id: exercise.oevelse.id,
            navn: exercise.lokaltNavn || exercise.oevelse.navn,
            beskrivelse: exercise.lokalBeskrivelse !== undefined ? exercise.lokalBeskrivelse : exercise.oevelse.beskrivelse,
            billedeSti: exercise.oevelse.billedeSti,
            brugerPositioner: exercise.oevelse.brugerPositioner,
            minimumDeltagere: exercise.oevelse.minimumDeltagere,
            kategoriNavn: exercise.lokalKategoriNavn || exercise.oevelse.kategoriNavn,
          },
        };
        
        return transformedExercise;
      });
      
      console.log(`Fandt ${transformedExercises.length} øvelser for træning ID: ${traeningId}`);
      return transformedExercises;
      
    } catch (innerError) {
      console.log(`Fejl ved forsøg på at hente med lokale detaljer: ${innerError instanceof Error ? innerError.message : "Ukendt fejl"}`);
      console.log("Prøver at hente uden lokale detaljer...");
      
      // # Fallback: Hent uden de nye tabeller hvis de ikke eksisterer
      const basicTrainingExercises = await db
        .select({
          id: traeningOevelser.id,
          traeningId: traeningOevelser.traeningId,
          oevelseId: traeningOevelser.oevelseId,
          position: traeningOevelser.position,
          oevelse: {
            id: oevelser.id,
            navn: oevelser.navn,
            beskrivelse: oevelser.beskrivelse,
            billedeSti: oevelser.billedeSti,
            brugerPositioner: oevelser.brugerPositioner,
            minimumDeltagere: oevelser.minimumDeltagere,
            kategoriNavn: kategorier.navn,
          },
        })
        .from(traeningOevelser)
        .leftJoin(oevelser, eq(traeningOevelser.oevelseId, oevelser.id))
        .leftJoin(kategorier, eq(oevelser.kategoriId, kategorier.id))
        .where(eq(traeningOevelser.traeningId, traeningId))
        .orderBy(traeningOevelser.position);
      
      console.log(`Fandt ${basicTrainingExercises.length} øvelser for træning ID: ${traeningId} (uden lokale detaljer)`);
      return basicTrainingExercises;
    }
    
  } catch (error) {
    console.error(`Fejl ved hentning af øvelser for træning ID: ${traeningId}:`, error);
    throw new Error(`Kunne ikke hente øvelser for træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Tilføj en øvelse til en træning
export async function tilfoejOevelseTilTraening(data: TraeningOevelseData) {
  try {
    console.log(`Tilføjer øvelse ID: ${data.oevelseId} til træning ID: ${data.traeningId}`);
    
    // # Hvis position ikke er angivet, find den højeste position og tilføj 1
    let position = data.position;
    if (!position) {
      // # Find den højeste position for træningen
      const maxPosition = await db
        .select({
          max: sql<number>`MAX(${traeningOevelser.position})`,
        })
        .from(traeningOevelser)
        .where(eq(traeningOevelser.traeningId, data.traeningId));
      
      position = maxPosition[0].max ? maxPosition[0].max + 1 : 1;
      console.log(`Tilføjer øvelse på position: ${position}`);
    }
    
    // # Indsæt relationen i databasen
    const result = await db.insert(traeningOevelser).values({
      traeningId: data.traeningId,
      oevelseId: data.oevelseId,
      position: position,
    }).returning({ id: traeningOevelser.id });
    
    const traeningOevelseId = result[0].id;
    console.log(`Øvelse tilføjet med ID: ${traeningOevelseId}`);
    
    // # Hent øvelsens detaljer
    const oevelseData = await db
      .select({
        id: oevelser.id,
        navn: oevelser.navn,
        beskrivelse: oevelser.beskrivelse,
        kategoriId: oevelser.kategoriId,
      })
      .from(oevelser)
      .where(eq(oevelser.id, data.oevelseId))
      .limit(1);
    
    if (oevelseData.length > 0) {
      // # Hent kategorinavnet
      let kategoriNavn = null;
      if (oevelseData[0].kategoriId) {
        const kategoriData = await db
          .select({ navn: kategorier.navn })
          .from(kategorier)
          .where(eq(kategorier.id, oevelseData[0].kategoriId))
          .limit(1);
        
        if (kategoriData.length > 0) {
          kategoriNavn = kategoriData[0].navn;
        }
      }
      
      // # Opret lokale detaljer for træningsøvelsen
      await db.insert(traeningOevelseDetaljer).values({
        traeningOevelseId: traeningOevelseId,
        navn: oevelseData[0].navn,
        beskrivelse: oevelseData[0].beskrivelse,
        kategoriNavn: kategoriNavn,
      });
      
      console.log(`Lokale detaljer oprettet for træningsøvelse ID: ${traeningOevelseId}`);
      
      // # Hent fokuspunkter for øvelsen og tilføj dem lokalt
      const fokuspunkter = await hentOevelseFokuspunkter(data.oevelseId);
      if (fokuspunkter.length > 0) {
        for (const fp of fokuspunkter) {
          await db.insert(traeningOevelseFokuspunkter).values({
            traeningOevelseId: traeningOevelseId,
            fokuspunktId: fp.id,
          });
        }
        console.log(`${fokuspunkter.length} fokuspunkter kopieret til træningsøvelse ID: ${traeningOevelseId}`);
      }
    }
    
    // # Revalidér sti, så siden opdateres (med 'page' parameter for at sikre fuld opdatering)
    revalidatePath(`/traening/faelles/${data.traeningId}`, 'page');
    
    return traeningOevelseId;
  } catch (error) {
    console.error("Fejl ved tilføjelse af øvelse til træning:", error);
    throw new Error(`Kunne ikke tilføje øvelse til træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Fjern en øvelse fra en træning
export async function fjernOevelseFraTraening(id: number) {
  try {
    console.log(`Fjerner træningsøvelse med ID: ${id}`);
    
    // # Først hent information om træningsøvelsen for at få træningsId og position
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
        position: traeningOevelser.position,
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, id))
      .limit(1);
    
    if (trainingExercise.length === 0) {
      throw new Error("Træningsøvelse ikke fundet");
    }
    
    const traeningId = trainingExercise[0].traeningId;
    const position = trainingExercise[0].position;
    
    // # Slet træningsøvelsen
    await db
      .delete(traeningOevelser)
      .where(eq(traeningOevelser.id, id));
    
    // # Hent alle øvelser med højere position
    const oevelserAtOpdatere = await db
      .select()
      .from(traeningOevelser)
      .where(
        and(
          eq(traeningOevelser.traeningId, traeningId),
          sql`${traeningOevelser.position} > ${position}`
        )
      );
    
    // # Opdater positioner for hver øvelse
    for (const oevelse of oevelserAtOpdatere) {
      await db
        .update(traeningOevelser)
        .set({
          position: oevelse.position - 1,
        })
        .where(eq(traeningOevelser.id, oevelse.id));
    }
    
    console.log(`Træningsøvelse fjernet og positioner opdateret`);
    
    // # Revalidér sti, så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved fjernelse af øvelse fra træning:", error);
    throw new Error(`Kunne ikke fjerne øvelse fra træning: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Opdater alle positioner for øvelser i en træning
export async function opdaterAlleTraeningOevelsePositioner(traeningId: number, positioner: {id: number, position: number}[]) {
  try {
    console.log(`Opdaterer alle positioner for træning ID: ${traeningId}`);
    
    // # Brug transaktion for at sikre, at alle opdateringer sker samtidigt
    for (const pos of positioner) {
      await db
        .update(traeningOevelser)
        .set({
          position: pos.position,
        })
        .where(eq(traeningOevelser.id, pos.id));
    }
    
    console.log(`Alle positioner opdateret for træning ID: ${traeningId}`);
    
    // # Revalidér sti, så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved opdatering af positioner for øvelser i træning:", error);
    throw new Error(`Kunne ikke opdatere positioner: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Interface for data til lokal opdatering af en træningsøvelse
export interface LokalTraeningOevelseData {
  id: number;               // # ID på træningsøvelsen der skal opdateres
  navn?: string | null;     // # Nyt navn (hvis det skal ændres)
  beskrivelse?: string | null;  // # Ny beskrivelse (hvis den skal ændres)
  kategoriNavn?: string | null; // # Nyt kategorinavn (hvis det skal ændres)
  fokuspunkter?: string[];  // # Nye fokuspunkter (hvis de skal ændres)
}

// # Opdater en træningsøvelse lokalt (kun i træningen, ikke i øvelsesbiblioteket)
export async function opdaterLokalTraeningOevelse(data: {
  id: number;
  navn: string;
  beskrivelse: string | null;
  kategoriNavn: string | null;
  fokuspunkter: string[];
}) {
  try {
    console.log(`Opdaterer lokal træningsøvelse med ID: ${data.id}`);
    
    // # Find øvelsen
    const traeningOevelseData = await db
      .select()
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, data.id))
      .limit(1);
    
    if (traeningOevelseData.length === 0) {
      throw new Error("Træningsøvelse ikke fundet");
    }
    
    const traeningOevelseId = traeningOevelseData[0].id;
    const traeningId = traeningOevelseData[0].traeningId;
    const oevelseId = traeningOevelseData[0].oevelseId;
    
    console.log(`Fandt træningsøvelse med ID: ${traeningOevelseId}, tilhører træning ID: ${traeningId}`);
    
    // # Opdater øvelsesdetaljer
    console.log(`Opdaterer detaljer: navn='${data.navn}', kategori=${data.kategoriNavn}, beskrivelse=${data.beskrivelse !== null ? `'${data.beskrivelse}'` : 'null'}`);
    
    // # Tjek om detaljer allerede eksisterer
    const eksisterendeDetaljer = await db
      .select()
      .from(traeningOevelseDetaljer)
      .where(eq(traeningOevelseDetaljer.traeningOevelseId, data.id))
      .limit(1);
    
    if (eksisterendeDetaljer.length > 0) {
      // # Opdater eksisterende detaljer
      await db
        .update(traeningOevelseDetaljer)
        .set({
          navn: data.navn,
          beskrivelse: data.beskrivelse,
          kategoriNavn: data.kategoriNavn,
        })
        .where(eq(traeningOevelseDetaljer.traeningOevelseId, data.id));
    } else {
      // # Opret nye detaljer hvis de ikke findes
      await db
        .insert(traeningOevelseDetaljer)
        .values({
          traeningOevelseId: data.id,
          navn: data.navn,
          beskrivelse: data.beskrivelse,
          kategoriNavn: data.kategoriNavn,
        });
    }
    
    console.log(`Øvelsesdetaljer opdateret for træningsøvelse ID: ${data.id}`);
    
    // # Håndter fokuspunkter
    if (data.fokuspunkter && data.fokuspunkter.length > 0) {
      // # Hent eksisterende fokuspunkter eller opret nye
      const fokuspunktIds = [];
      
      console.log(`Behandler ${data.fokuspunkter.length} fokuspunkter: ${data.fokuspunkter.join(', ')}`);
      
      for (const fokuspunktTekst of data.fokuspunkter) {
        // # Tjek om fokuspunktet allerede eksisterer
        const eksisterendeFokuspunkt = await db
          .select()
          .from(fokuspunkter)
          .where(eq(fokuspunkter.tekst, fokuspunktTekst))
          .limit(1);
        
        let fokuspunktId;
        
        if (eksisterendeFokuspunkt.length > 0) {
          // # Brug eksisterende fokuspunkt
          fokuspunktId = eksisterendeFokuspunkt[0].id;
          console.log(`Bruger eksisterende fokuspunkt: "${fokuspunktTekst}" (ID: ${fokuspunktId})`);
        } else {
          // # Opret nyt fokuspunkt
          const nytFokuspunkt = await opretFokuspunkt(fokuspunktTekst);
          fokuspunktId = nytFokuspunkt.id;
          console.log(`Oprettet nyt fokuspunkt: "${fokuspunktTekst}" (ID: ${fokuspunktId})`);
        }
        
        fokuspunktIds.push(fokuspunktId);
      }
      
      // # Opdater fokuspunkter for træningsøvelsen
      if (fokuspunktIds.length > 0) {
        // # Fjern først alle eksisterende fokuspunkter for denne træningsøvelse
        await db
          .delete(traeningOevelseFokuspunkter)
          .where(eq(traeningOevelseFokuspunkter.traeningOevelseId, data.id));
        
        console.log(`Fjernet eksisterende fokuspunkter for træningsøvelse ID: ${data.id}`);
        
        // # Tilføj de nye fokuspunkter
        for (const fokuspunktId of fokuspunktIds) {
          await db
            .insert(traeningOevelseFokuspunkter)
            .values({
              traeningOevelseId: data.id,
              fokuspunktId,
            });
          console.log(`Tilføjet fokuspunkt ID: ${fokuspunktId} til træningsøvelse ID: ${data.id}`);
        }
      }
    } else {
      // # Hvis der ikke er nogen fokuspunkter, fjern alle eksisterende
      await db
        .delete(traeningOevelseFokuspunkter)
        .where(eq(traeningOevelseFokuspunkter.traeningOevelseId, data.id));
      
      console.log(`Ingen fokuspunkter angivet, alle eksisterende fokuspunkter er fjernet for træningsøvelse ID: ${data.id}`);
    }
    
    console.log(`Lokale ændringer for træningsøvelse med ID: ${data.id} er blevet behandlet:`);
    console.log(`- Navn: ${data.navn}`);
    console.log(`- Kategori: ${data.kategoriNavn}`);
    console.log(`- Beskrivelse: ${data.beskrivelse}`);
    console.log(`- Fokuspunkter: ${data.fokuspunkter?.join(', ')}`);
    
    // # Revalidér sti med page type for at sikre fuld opdatering
    console.log(`Revaliderer sti med træning ID: ${traeningId}`);
    revalidatePath(`/traening/faelles/${traeningId}`, 'page');
    
    return { success: true };
  } catch (error) {
    console.error("Fejl ved opdatering af lokal træningsøvelse:", error);
    throw new Error(`Kunne ikke opdatere træningsøvelse: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Hent fokuspunkter for en specifik træningsøvelse med prioritet til lokale fokuspunkter
export async function hentTraeningOevelseFokuspunkter(traeningOevelseId: number) {
  try {
    console.log(`Henter fokuspunkter for træningsøvelse ID: ${traeningOevelseId}`);
    
    // # Hent først den aktuelle træningsøvelse for at få øvelses-id
    const trainingExercise = await db
      .select({
        oevelseId: traeningOevelser.oevelseId
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, traeningOevelseId))
      .limit(1);
    
    if (trainingExercise.length === 0) {
      throw new Error("Træningsøvelse ikke fundet");
    }
    
    const oevelseId = trainingExercise[0].oevelseId;
    
    try {
      // # Først tjek om der er lokale fokuspunkter for denne træningsøvelse
      const lokaleFokuspunkter = await db
        .select({
          id: fokuspunkter.id,
          tekst: fokuspunkter.tekst
        })
        .from(traeningOevelseFokuspunkter)
        .innerJoin(fokuspunkter, eq(traeningOevelseFokuspunkter.fokuspunktId, fokuspunkter.id))
        .where(eq(traeningOevelseFokuspunkter.traeningOevelseId, traeningOevelseId));
      
      // # Hvis der er lokale fokuspunkter, brug dem
      if (lokaleFokuspunkter.length > 0) {
        console.log(`Fandt ${lokaleFokuspunkter.length} lokale fokuspunkter for træningsøvelse ID: ${traeningOevelseId}`);
        return lokaleFokuspunkter;
      }
    } catch (innerError) {
      console.log(`Fejl ved forsøg på at hente lokale fokuspunkter: ${innerError instanceof Error ? innerError.message : "Ukendt fejl"}`);
      console.log("Prøver at hente originale fokuspunkter i stedet...");
    }
    
    // # Ellers hent de originale fokuspunkter for øvelsen
    console.log(`Henter originale fokuspunkter for øvelse ID: ${oevelseId}`);
    return await hentOevelseFokuspunkter(oevelseId);
  } catch (error) {
    console.error(`Fejl ved hentning af fokuspunkter for træningsøvelse ID: ${traeningOevelseId}:`, error);
    throw new Error(`Kunne ikke hente fokuspunkter: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
  }
}

// # Eksporter funktioner til at håndtere deltagere i øvelser
export { tilfoejDeltagereOevelse, fjernDeltagereOevelse, hentOevelseDeltagere, tilfoejAlleTilstedevaerende, fjernAlleDeltagere };

// # Eksporter funktioner til at håndtere positioner for spillere i øvelser
export { 
  tildelPositionTilSpiller, 
  fjernPositionFraSpiller, 
  fjernAllePositionerFraOevelse, 
  hentOevelseSpillerPositioner, 
  hentOevelsePositionskrav, 
  hentForeslaaedeSpillereV2
};

// # Interface for at opdatere deltagere i en øvelse
export interface OevelseDeltagereData {
  traeningOevelseId: number;
  spillerIds: number[];
}

// # Interface for en deltager
interface Deltager {
  spillerId: number;
  navn: string;
  nummer: number | null;
  erMaalMand: boolean;
  holdId: number;
  holdNavn: string;
  tilstede: boolean;
}

/**
 * Henter alle deltagere til en træning
 * @param traeningId ID på træningen
 * @returns Liste af deltagere
 */
export async function hentTraeningDeltagere(traeningId: number): Promise<Deltager[]> {
  try {
    // # Hent alle spillere der er tilmeldt træningen (via hold eller individuelt)
    const deltagere = await db
      .select({
        spillerId: spillere.id,
        navn: spillere.navn,
        nummer: spillere.nummer,
        erMaalMand: spillere.erMV,
        holdId: hold.id,
        holdNavn: hold.navn,
        tilstede: traeningDeltager.tilstede,
      })
      .from(traeningDeltager)
      .innerJoin(spillere, eq(traeningDeltager.spillerId, spillere.id))
      .innerJoin(hold, eq(spillere.holdId, hold.id))
      .where(eq(traeningDeltager.traeningId, traeningId));

    return deltagere;
  } catch (error) {
    console.error("Fejl ved hentning af deltagere:", error);
    throw new Error("Kunne ikke hente deltagere");
  }
} 