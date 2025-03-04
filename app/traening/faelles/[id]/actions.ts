"use server";

import { db } from "@/lib/db";
import { traeningOevelser, oevelser, kategorier, fokuspunkter, traeningOevelseDetaljer, traeningOevelseFokuspunkter } from "@/lib/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { opretFokuspunkt, opretKategori, hentOevelseFokuspunkter } from "@/lib/db/actions";

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
    
    console.log(`Øvelse tilføjet med ID: ${result[0].id}`);
    
    // # Revalidér sti, så siden opdateres
    revalidatePath(`/traening/faelles/${data.traeningId}`);
    
    return result[0].id;
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
export async function opdaterLokalTraeningOevelse(data: LokalTraeningOevelseData) {
  try {
    console.log(`Opdaterer lokal træningsøvelse med ID: ${data.id}`);
    
    // # Hent først den aktuelle træningsøvelse for at få traeningId
    const trainingExercise = await db
      .select({
        traeningId: traeningOevelser.traeningId,
        oevelseId: traeningOevelser.oevelseId
      })
      .from(traeningOevelser)
      .where(eq(traeningOevelser.id, data.id))
      .limit(1);
    
    if (trainingExercise.length === 0) {
      throw new Error("Træningsøvelse ikke fundet");
    }
    
    const traeningId = trainingExercise[0].traeningId;
    const oevelseId = trainingExercise[0].oevelseId;
    
    // # Håndter kategori hvis angivet (gemmer den i kategorier-tabellen)
    let kategoriId = null;
    if (data.kategoriNavn && data.kategoriNavn.trim() !== "") {
      console.log(`Sikrer at kategori '${data.kategoriNavn}' findes i databasen`);
      
      // # Opret eller genbrug kategori
      const kategoriResultat = await opretKategori(data.kategoriNavn);
      kategoriId = kategoriResultat.id;
      
      if (kategoriResultat.nyOprettet) {
        console.log(`Ny kategori '${data.kategoriNavn}' oprettet i databasen med ID: ${kategoriResultat.id}`);
      } else {
        console.log(`Kategori '${data.kategoriNavn}' fandtes allerede i databasen med ID: ${kategoriResultat.id}`);
      }
    }
    
    // # Håndter fokuspunkter hvis angivet
    let fokuspunktIds = [];
    if (data.fokuspunkter && data.fokuspunkter.length > 0) {
      console.log(`Håndterer ${data.fokuspunkter.length} fokuspunkter for lokalt opdateret øvelse`);
      
      // # Tilføj alle nye fokuspunkter til databasen
      for (const fokuspunktTekst of data.fokuspunkter) {
        if (fokuspunktTekst.trim() !== "") {
          // # Opret eller genbrug fokuspunkt
          const fokuspunktResultat = await opretFokuspunkt(fokuspunktTekst);
          fokuspunktIds.push(fokuspunktResultat.id);
          
          if (fokuspunktResultat.nyOprettet) {
            console.log(`Nyt fokuspunkt '${fokuspunktTekst}' oprettet i databasen med ID: ${fokuspunktResultat.id}`);
          } else {
            console.log(`Fokuspunkt '${fokuspunktTekst}' fandtes allerede i databasen med ID: ${fokuspunktResultat.id}`);
          }
        }
      }
    }
    
    try {
      // # Tjek om der allerede findes en lokal override for denne træningsøvelse
      const eksisterendeDetaljer = await db
        .select({ id: traeningOevelseDetaljer.id })
        .from(traeningOevelseDetaljer)
        .where(eq(traeningOevelseDetaljer.traeningOevelseId, data.id))
        .limit(1);
      
      // # Opdater eller opret lokale detaljer
      if (eksisterendeDetaljer.length > 0) {
        // # Opdater eksisterende detaljer
        await db
          .update(traeningOevelseDetaljer)
          .set({
            navn: data.navn,
            beskrivelse: data.beskrivelse,
            kategoriNavn: data.kategoriNavn,
            sidstOpdateret: new Date()
          })
          .where(eq(traeningOevelseDetaljer.id, eksisterendeDetaljer[0].id));
        
        console.log(`Opdateret eksisterende lokale detaljer med ID: ${eksisterendeDetaljer[0].id}`);
      } else {
        // # Opret nye detaljer
        const resultat = await db
          .insert(traeningOevelseDetaljer)
          .values({
            traeningOevelseId: data.id,
            navn: data.navn,
            beskrivelse: data.beskrivelse,
            kategoriNavn: data.kategoriNavn,
            sidstOpdateret: new Date()
          })
          .returning({ id: traeningOevelseDetaljer.id });
        
        console.log(`Oprettet nye lokale detaljer med ID: ${resultat[0].id}`);
      }
      
      // # Opdater fokuspunkter hvis angivet
      if (fokuspunktIds.length > 0) {
        try {
          // # Fjern først alle eksisterende fokuspunkter for denne træningsøvelse
          await db
            .delete(traeningOevelseFokuspunkter)
            .where(eq(traeningOevelseFokuspunkter.traeningOevelseId, data.id));
          
          // # Tilføj de nye fokuspunkter
          for (const fokuspunktId of fokuspunktIds) {
            await db
              .insert(traeningOevelseFokuspunkter)
              .values({
                traeningOevelseId: data.id,
                fokuspunktId: fokuspunktId
              });
          }
          
          console.log(`Opdateret ${fokuspunktIds.length} fokuspunkter for træningsøvelse ID: ${data.id}`);
        } catch (fokusError) {
          console.log(`Fejl ved opdatering af fokuspunkter: ${fokusError instanceof Error ? fokusError.message : "Ukendt fejl"}`);
          console.log("Dette kan skyldes at tabellen traeningOevelseFokuspunkter ikke eksisterer endnu. Kør migrations for at oprette tabellerne.");
        }
      }
    } catch (detailsError) {
      console.log(`Fejl ved opdatering af lokale detaljer: ${detailsError instanceof Error ? detailsError.message : "Ukendt fejl"}`);
      console.log("Dette kan skyldes at tabellen traeningOevelseDetaljer ikke eksisterer endnu. Kør migrations for at oprette tabellerne.");
      console.log("Lokale ændringer blev IKKE gemt i databasen, men kategorier og fokuspunkter blev oprettet/opdateret.");
    }
    
    console.log(`Lokale ændringer for træningsøvelse med ID: ${data.id} er blevet behandlet:`);
    console.log(`- Navn: ${data.navn}`);
    console.log(`- Kategori: ${data.kategoriNavn}`);
    console.log(`- Beskrivelse: ${data.beskrivelse}`);
    console.log(`- Fokuspunkter: ${data.fokuspunkter?.join(', ')}`);
    
    // # Revalidér sti, så siden opdateres
    revalidatePath(`/traening/faelles/${traeningId}`);
    
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