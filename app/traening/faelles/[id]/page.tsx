import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  hentTraening, 
  hentTilmeldteHold, 
  hentSpillereTilTraening, 
  hentTilstedevarelse 
} from "@/lib/db/actions";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Toaster } from "sonner";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { TilmeldeHoldForm } from "./tilmelde-hold-form";
import { DeltagerListe } from "./deltager-liste";
import { TraeningDetaljer } from "./traening-detaljer";
import { TraeningModulWrapper } from "./traening-modul-wrapper";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { traeninger, traeningHold, hold, spillere } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { TraeningOpsaetningGuide } from "./traening-opsaetning-guide";
import { FaneVejledning } from "./fane-vejledning";

// # Funktion der genererer metadata for siden (sidetitel)
export async function generateMetadata({ params }: { params: { id: string } }) {
  // # Først await params selv, før vi tilgår dets egenskaber
  params = await params;
  const id = parseInt(params.id);
  const traening = await hentTraening(id);
  
  return {
    title: traening ? `Træning: ${traening.navn}` : "Træning ikke fundet",
  };
}

// # Interface til at definere de parametre, der sendes til siden
interface TraeningPageParams {
  params: { id: string };
}

// # Interface for spillere (matcher DeltagerListe komponentens forventning)
interface Spiller {
  spiller_id: number;
  navn: string;
  nummer?: number;
  holdId: number;
  holdNavn: string;
  erMaalMand: boolean;
}

// # Hent data for træningen og tilknyttede detaljer
async function getTraeningData(id: number) {
  try {
    // # OPGRADERET VERSION: Kører parallelle forespørgsler men uden at bruge relations API
    // # der forårsagede TypeError: Cannot read properties of undefined (reading 'referencedTable')
    
    // # Brug Promise.all til at køre forespørgsler parallelt
    const [trainingDataResult, tilmeldteHoldResult, alleHoldResult, tilstedevaerelsesData] = await Promise.all([
      // # Hent træningsdata
      db.select()
        .from(traeninger)
        .where(eq(traeninger.id, id))
        .limit(1),
      
      // # Hent hold, der er tilmeldt træningen
      db.select({
        traening_hold_id: traeningHold.traeningId,
        hold_id: traeningHold.holdId,
        hold_navn: hold.navn
      })
      .from(traeningHold)
      .innerJoin(hold, eq(traeningHold.holdId, hold.id))
      .where(eq(traeningHold.traeningId, id)),
      
      // # Hent alle hold
      db.select({
        id: hold.id,
        navn: hold.navn
      })
      .from(hold)
      .orderBy(hold.navn),
      
      // # Hent tilstedeværelsesdata
      hentTilstedevarelse(id)
    ]);
    
    if (!trainingDataResult.length) {
      return null;
    }
    
    // # Optimeret hentning af alle spillere fra tilmeldte hold
    const holdIds = tilmeldteHoldResult.map(h => h.hold_id);
    
    // # Hent alle spillere for de relevante hold i én forespørgsel, hvis der er tilmeldte hold
    let alleSpillereListe: Spiller[] = [];
    if (holdIds.length > 0) {
      const spillereListe = await db
        .select({
          spiller_id: spillere.id,
          navn: spillere.navn,
          nummer: spillere.nummer,
          holdId: spillere.holdId,
          holdNavn: hold.navn,
          erMaalMand: spillere.erMV
        })
        .from(spillere)
        .innerJoin(hold, eq(spillere.holdId, hold.id))
        .where(inArray(spillere.holdId, holdIds));
        
      // # Konverter nummer fra null til undefined
      alleSpillereListe = spillereListe.map(spiller => ({
        ...spiller,
        nummer: spiller.nummer === null ? undefined : spiller.nummer
      }));
    }
    
    // # Returner alle de hentede data struktureret
    return {
      traening: trainingDataResult[0],
      tilmeldteHold: tilmeldteHoldResult,
      alleHold: alleHoldResult,
      spillere: alleSpillereListe,
      tilstedevaerelsesData
    };
    
  } catch (error) {
    console.error("Fejl ved hentning af træningsdata:", error);
    return null;
  }
}

// # Hoveddelen af siden, som viser detaljer om træningen
export default async function FaellesTraeningPage({ params }: { params: { id: string } }) {
  // # Først await params selv, før vi tilgår dets egenskaber
  params = await params;
  // # Få id fra parametrene
  const id = parseInt(params.id);
  
  // # Hent data for træningen
  const data = await getTraeningData(id);
  
  // # Hvis data ikke findes, vis 404
  if (!data) {
    notFound();
  }
  
  // # Konverter null-værdier til undefined for at undgå typefejl
  const formattedTraening = {
    ...data.traening,
    beskrivelse: data.traening.beskrivelse || undefined,
    holdId: data.traening.holdId || undefined
  };
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-8">
        {/* # Hjælpetekst og status for træningsopsætning */}
        <TraeningOpsaetningGuide 
          tilmeldteHold={data.tilmeldteHold} 
          tilstedevaerelsesData={data.tilstedevaerelsesData} 
          traeningId={Number(id)}
        />
        
        {/* # Øverste del med titel og tilbage-knap */}
        <div className="flex justify-between items-center">
          <div>
            <Link href="/traening" prefetch={false}>
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Tilbage til oversigt
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {formattedTraening.navn}
            </h1>
            <div className="text-sm text-muted-foreground mt-1 flex space-x-4">
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-4 w-4" />
                {formattedTraening.dato ? format(new Date(formattedTraening.dato), 'EEEE d. MMMM yyyy', { locale: da }) : 'Ingen dato'}
              </div>
              <div className="flex items-center">
                <ClockIcon className="mr-1 h-4 w-4" />
                {formattedTraening.dato ? format(new Date(formattedTraening.dato), 'HH:mm', { locale: da }) : 'Intet tidspunkt'}
              </div>
            </div>
          </div>
        </div>
        
        <Toaster />
        
        {/* # Faner for at navigere mellem forskellige dele af træningen */}
        <Tabs defaultValue="hold" className="space-y-4">
          <TabsList>
            <TabsTrigger value="traening">Træning</TabsTrigger>
            <TabsTrigger value="detaljer">Detaljer</TabsTrigger>
            <TabsTrigger value="deltagere">Deltagere</TabsTrigger>
            <TabsTrigger value="hold">Tilmeldte Hold</TabsTrigger>
          </TabsList>
          
          {/* # Oversigt over, hvad de forskellige faner bruges til */}
          <FaneVejledning traeningId={Number(id)} />
          
          {/* # Indholdet af fanen 'Træning' */}
          <TabsContent value="traening" className="space-y-4">
            <TraeningModulWrapper traeningId={id} />
          </TabsContent>
          
          {/* # Indholdet af fanen 'Detaljer' */}
          <TabsContent value="detaljer" className="space-y-4">
            <TraeningDetaljer traening={formattedTraening} />
          </TabsContent>
          
          {/* # Indholdet af fanen 'Deltagere' */}
          <TabsContent value="deltagere" className="space-y-4">
            <DeltagerListe 
              traeningId={id} 
              spillere={data.spillere} 
              tilstedevarelse={data.tilstedevaerelsesData}
            />
          </TabsContent>
          
          {/* # Indholdet af fanen 'Hold' */}
          <TabsContent value="hold" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tilmeldte Hold</CardTitle>
                <CardDescription>
                  Hold, der er tilmeldt denne træning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {data.tilmeldteHold.length > 0 ? (
                      data.tilmeldteHold.map((hold) => (
                        <Card key={hold.hold_id} className="p-4">
                          <h3 className="font-medium">{hold.hold_navn}</h3>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        Ingen hold er tilmeldt til denne træning
                      </p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <TilmeldeHoldForm
                    traeningId={id}
                    alleHold={data.alleHold}
                    tilmeldteHold={data.tilmeldteHold.map((h) => h.hold_id)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* # Navigationsknapper i bunden af siden */}
        <div className="flex justify-between items-center pt-6 border-t mt-8">
          <Link href="/traening" prefetch={false}>
            <Button variant="outline">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Tilbage til træningsoversigt
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 