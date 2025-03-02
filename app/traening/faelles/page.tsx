import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Plus, Calendar, Clock, Trophy, Users } from "lucide-react";
import { db } from "@/lib/db";
import { traeninger, traeningHold, hold } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpretFaellesTraeningButton } from "./opret-faelles-traening-button";

// # Metadatainformation for siden
export const metadata = {
  title: "Fælles Træninger",
  description: "Administrer fælles træninger med flere hold",
};

// # Hent alle fælles træninger med antallet af hold tilmeldt
async function hentFaellesTraeninger() {
  try {
    // # Hent fælles træninger med join til traeningHold for at tælle hold
    const traeningsmøder = await db
      .select({
        id: traeninger.id,
        navn: traeninger.navn,
        beskrivelse: traeninger.beskrivelse,
        dato: traeninger.dato,
        oprettetDato: traeninger.oprettetDato,
        holdCount: count(traeningHold.holdId).as("holdCount"),
      })
      .from(traeninger)
      .leftJoin(traeningHold, eq(traeninger.id, traeningHold.traeningId))
      .where(eq(traeninger.flereTilmeldte, true))
      .groupBy(traeninger.id)
      .orderBy(desc(traeninger.dato));

    // # For hver træning, hent navnene på de tilmeldte hold
    const traeningsmøderMedHold = await Promise.all(
      traeningsmøder.map(async (traening) => {
        const tilmeldteHold = await db
          .select({
            navn: hold.navn,
          })
          .from(traeningHold)
          .innerJoin(hold, eq(traeningHold.holdId, hold.id))
          .where(eq(traeningHold.traeningId, traening.id));

        return {
          ...traening,
          holdNavne: tilmeldteHold.map((h) => h.navn),
        };
      })
    );

    return traeningsmøderMedHold;
  } catch (error) {
    console.error("Fejl ved hentning af fælles træninger:", error);
    return [];
  }
}

// # Hovedkomponent for siden
export default async function FaellesTraeningerPage() {
  // # Hent data om fælles træninger
  const traeningsmøder = await hentFaellesTraeninger();

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fælles Træninger</h1>
        <OpretFaellesTraeningButton />
      </div>

      <p className="text-muted-foreground">
        Administrer træningssessioner med spillere fra flere hold
      </p>

      {traeningsmøder.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/40">
          <Trophy className="w-12 h-12 text-muted-foreground mb-3" />
          <h2 className="text-xl font-semibold">Ingen fælles træninger endnu</h2>
          <p className="max-w-md mt-1 mb-4 text-muted-foreground">
            Opret din første fælles træning ved at klikke på knappen ovenfor.
          </p>
          <OpretFaellesTraeningButton variant="default" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {traeningsmøder.map((traening) => (
            <Card key={traening.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="truncate">{traening.navn}</CardTitle>
                {traening.beskrivelse && (
                  <CardDescription className="line-clamp-2">
                    {traening.beskrivelse}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 opacity-70" />
                    <span>
                      {format(new Date(traening.dato), "EEEE d. MMMM yyyy", {
                        locale: da,
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 opacity-70" />
                    <span>
                      {traening.holdCount} {traening.holdCount === 1 ? "hold" : "hold"} tilmeldt
                    </span>
                  </div>
                  
                  {traening.holdNavne.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {traening.holdNavne.map((holdNavn, index) => (
                        <Badge key={index} variant="outline">
                          {holdNavn}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-1">
                <Button asChild className="w-full">
                  <Link href={`/traening/faelles/${traening.id}`}>
                    Administrer træning
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 