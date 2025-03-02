import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Users, Calendar, ListChecks, DumbbellIcon, ClipboardList, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sletTraening } from "./actions";
import TraeningCard from "@/components/traening/traening-card";

// # Metadatainformation for siden
export const metadata = {
  title: "Træninger",
  description: "Administrer træninger og øvelser for hold",
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
    <div className="container space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Træningscentral</h1>
        <p className="text-muted-foreground mt-2">
          Administrer træninger, øvelser og træningsplanlægning fra ét sted
        </p>
      </div>

      {/* # Handlingsknapper */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/traening/faelles">
            <Calendar className="mr-2 h-4 w-4" />
            Opret ny træning
          </Link>
        </Button>
        <Button variant="outline">
          <DumbbellIcon className="mr-2 h-4 w-4" />
          Gå til øvelsesbibliotek
        </Button>
      </div>

      {/* # Tabs til at skifte mellem forskellige visninger */}
      <Tabs defaultValue="traening" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="traening">Træninger</TabsTrigger>
          <TabsTrigger value="oevelser">Øvelsesbibliotek</TabsTrigger>
          <TabsTrigger value="vaerktoejer">Trænerværktøjer</TabsTrigger>
        </TabsList>
        
        {/* # Træningsfane */}
        <TabsContent value="traening" className="space-y-8">
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
        </TabsContent>
        
        {/* # Øvelses-fane */}
        <TabsContent value="oevelser" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Øvelsesbibliotek</h2>
            <p className="text-muted-foreground mb-6">
              Find og opret øvelser til dine træninger. Søg blandt eksisterende øvelser eller tilføj dine egne.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <Button asChild>
                <Link href="/traening/oevelser">
                  <DumbbellIcon className="mr-2 h-4 w-4" />
                  Gå til øvelsesbibliotek
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* # Kort til øvelsesbibliotek */}
              <Card>
                <CardHeader>
                  <CardTitle>Find øvelser</CardTitle>
                  <CardDescription>Gennemse øvelsesbiblioteket</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Søg blandt eksisterende øvelser kategoriseret efter type og formål.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/traening/oevelser">Se alle øvelser</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* # Kort til at oprette øvelser */}
              <Card>
                <CardHeader>
                  <CardTitle>Opret øvelse</CardTitle>
                  <CardDescription>Tilføj dine egne øvelser</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Opret tilpassede øvelser med positionskrav eller minimumskrav til deltagere.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/traening/oevelser">Opret ny øvelse</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* # Trænerværktøjer-fane */}
        <TabsContent value="vaerktoejer" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Trænerværktøjer</h2>
            <p className="text-muted-foreground mb-6">
              Få adgang til værktøjer der hjælper dig med at planlægge og evaluere dine træningssessioner.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* # Kort til træningsplanlægning */}
              <Card>
                <CardHeader>
                  <CardTitle>Træningsplanlægning</CardTitle>
                  <CardDescription>Opret og tilpas træningssessioner</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Lav strukturerede træningsplaner med øvelser, tidsplaner og fokusområder.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/traening/faelles">Planlæg træning</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* # Kort til øvelsesbibliotek */}
              <Card>
                <CardHeader>
                  <CardTitle>Øvelsesbibliotek</CardTitle>
                  <CardDescription>Find og opret øvelser</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Søg blandt øvelser eller opret dine egne tilpassede øvelser til dine hold.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Gå til bibliotek</Button>
                </CardFooter>
              </Card>
              
              {/* # Kort til træningsevaluering */}
              <Card>
                <CardHeader>
                  <CardTitle>Træningsevaluering</CardTitle>
                  <CardDescription>Evaluer dine træningssessioner</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Registrer feedback og resultater fra gennemførte træninger.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Evaluer træning</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 