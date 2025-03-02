import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Users, Calendar, ListChecks } from "lucide-react";
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

// # Metadatainformation for siden
export const metadata = {
  title: "Træninger",
  description: "Administrer træninger for hold og på tværs af hold",
};

// # Interface for træningsdata
interface TraeningBase {
  id: number;
  navn: string;
  beskrivelse: string | null;
  dato: Date;
  oprettetDato: Date;
}

// # Interface for træning med holddata
interface TraeningMedHold extends TraeningBase {
  flereTilmeldte: boolean;
  holdCount: number;
  holdNavne: string[];
}

// # Hent alle træninger med antallet af hold tilmeldt
async function hentAlleTraeninger() {
  try {
    // # Hent træninger med join til traeningHold for at tælle hold
    const traeningsmøder = await db
      .select({
        id: traeninger.id,
        navn: traeninger.navn,
        beskrivelse: traeninger.beskrivelse,
        dato: traeninger.dato,
        oprettetDato: traeninger.oprettetDato,
        flereTilmeldte: traeninger.flereTilmeldte,
        holdCount: count(traeningHold.holdId).as("holdCount"),
      })
      .from(traeninger)
      .leftJoin(traeningHold, eq(traeninger.id, traeningHold.traeningId))
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
    console.error("Fejl ved hentning af træninger:", error);
    return [];
  }
}

// # Hovedkomponent for siden
export default async function TraeningPage() {
  // # Hent data om træninger
  const traeningsmøder = await hentAlleTraeninger();

  // # Opdel i fælles træninger og holdtræninger
  const faellesTraeninger = traeningsmøder.filter(t => t.flereTilmeldte);
  const holdTraeninger = traeningsmøder.filter(t => !t.flereTilmeldte);

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Træninger</h1>
        <p className="text-muted-foreground mt-2">
          Administrer træningssessioner for hold og på tværs af hold
        </p>
      </div>

      {/* # Sektion for fælles træninger */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Fælles Træninger</h2>
          <Button asChild>
            <Link href="/traening/faelles">
              <ListChecks className="mr-2 h-4 w-4" />
              Se alle fælles træninger
            </Link>
          </Button>
        </div>
        
        {faellesTraeninger.length === 0 ? (
          <p className="text-muted-foreground py-4">
            Der er ingen fælles træninger endnu. 
            <Link href="/traening/faelles" className="ml-1 underline">
              Opret din første fælles træning her.
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {faellesTraeninger.slice(0, 3).map((traening) => (
              <TraeningCard key={traening.id} traening={traening} />
            ))}
          </div>
        )}
      </div>

      {/* # Sektion for holdtræninger */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Holdtræninger</h2>
          <Button asChild>
            <Link href="/hold">
              <Users className="mr-2 h-4 w-4" />
              Administrer hold
            </Link>
          </Button>
        </div>
        
        {holdTraeninger.length === 0 ? (
          <p className="text-muted-foreground py-4">
            Der er ingen holdtræninger endnu. 
            <Link href="/hold" className="ml-1 underline">
              Opret et hold for at komme i gang.
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {holdTraeninger.slice(0, 3).map((traening) => (
              <TraeningCard key={traening.id} traening={traening} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// # Komponent til at vise et træningskort
function TraeningCard({ traening }: { traening: TraeningMedHold }) {
  return (
    <Card className="overflow-hidden">
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
          <Link href={
            traening.flereTilmeldte 
              ? `/traening/faelles/${traening.id}` 
              : `/hold/${traening.holdNavne[0]}/${traening.id}`
          }>
            Administrer træning
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 