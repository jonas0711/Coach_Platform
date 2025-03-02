"use server";

import { db } from "@/lib/db";
import { traeninger, traeningHold } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// # Server action til at slette en træning baseret på dens ID
// # Fjerner først relationer i traeningHold-tabellen og derefter selve træningen
export async function sletTraening(traeningId: number) {
  try {
    console.log(`Forsøger at slette træning med ID: ${traeningId}`);
    
    // # Først slettes alle hold-relationer for træningen
    await db
      .delete(traeningHold)
      .where(eq(traeningHold.traeningId, traeningId));
    
    console.log(`Hold-relationer er slettet for træning ${traeningId}`);
    
    // # Derefter slettes selve træningen
    await db
      .delete(traeninger)
      .where(eq(traeninger.id, traeningId));
    
    console.log(`Træning med ID ${traeningId} er blevet slettet`);
    
    // # Revaliderer træningssiden for at opdatere visningen
    revalidatePath('/traening');
    
    return { success: true, message: "Træningen er blevet slettet" };
  } catch (error) {
    console.error("Fejl under sletning af træning:", error);
    return { success: false, message: "Der opstod en fejl under sletning af træningen" };
  }
} 