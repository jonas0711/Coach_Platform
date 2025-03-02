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
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { traeninger, traeningHold, hold, spillere } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// # Funktion der genererer metadata for siden (sidetitel)
export async function generateMetadata({ params }: { params: { id: string } }) {
  // # Først await params selv, før vi tilgår dets egenskaber
  params = await params;
  const id = params.id;
  const traening = await hentTraening(parseInt(id));
  
  return {
    title: traening ? `Træning: ${traening.navn}` : "Træning ikke fundet",
  };
}

// # Interface til at definere de parametre, der sendes til siden
interface TraeningPageParams {
  params: {
    id: string;
  };
}

// # Hent data for træningen og tilknyttede detaljer
async function getTraeningData(id: number) {
  try {
    // # Hent træningsdata
    const trainingData = await db
      .select()
      .from(traeninger)
      .where(eq(traeninger.id, id))
      .limit(1);
    
    if (!trainingData.length) {
      return null;
    }
    
    // # Hent hold, der er tilmeldt træningen
    const tilmeldteHold = await db
      .select({
        traening_hold_id: traeningHold.traeningId,
        hold_id: traeningHold.holdId,
        hold_navn: hold.navn
      })
      .from(traeningHold)
      .innerJoin(hold, eq(traeningHold.holdId, hold.id))
      .where(eq(traeningHold.traeningId, id));
    
    // # Hent alle hold, der kan tilmeldes til en træning
    const alleHold = await db
      .select({
        id: hold.id,
        navn: hold.navn
      })
      .from(hold)
      .orderBy(hold.navn);

    // # Hent alle spillere fra de tilmeldte hold
    let alleSpillereListe: any[] = [];
    
    if (tilmeldteHold.length > 0) {
      // # For hvert tilmeldt hold, hent dets spillere
      for (const holdInfo of tilmeldteHold) {
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
          .where(eq(spillere.holdId, holdInfo.hold_id));
          
        alleSpillereListe = [...alleSpillereListe, ...spillereListe];
      }
    }
    
    // # Hent tilstedeværelsesdata
    const tilstedevaerelsesData = await hentTilstedevarelse(id);
    
    // # Returner alle de hentede data struktureret
    return {
      traening: trainingData[0],
      tilmeldteHold,
      alleHold,
      spillere: alleSpillereListe,
      tilstedevaerelsesData
    };
    
  } catch (error) {
    console.error("Fejl ved hentning af træningsdata:", error);
    return null;
  }
}

// # Hovedkomponent for visning af en specifik træning
export default async function TraeningPage({ params }: TraeningPageParams) {
  // # Først await params selv, før vi tilgår dets egenskaber
  params = await params;
  const id = params.id;
  const traeningId = parseInt(id);
  
  // # Tjek om trænings-ID er et gyldigt tal
  if (isNaN(traeningId)) {
    notFound();
  }
  
  // # Hent træningsdata
  const data = await getTraeningData(traeningId);
  
  // # Hvis ingen træningsdata findes, vis 404-siden
  if (!data) {
    notFound();
  }
  
  return (
    <div className="space-y-6 container py-8">
      <div>
        <h1 className="text-3xl font-bold">{data.traening.navn}</h1>
        <p className="text-muted-foreground mt-2">
          Administrer detaljer, tilmeldte hold og tilstedeværelse for denne træning
        </p>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="detaljer" className="space-y-6">
        <TabsList>
          <TabsTrigger value="detaljer">Træningsdetaljer</TabsTrigger>
          <TabsTrigger value="hold">Tilmeld hold</TabsTrigger>
          <TabsTrigger value="deltagere">Tilstedeværelse</TabsTrigger>
        </TabsList>
        
        {/* # Træningsdetaljer-fanen */}
        <TabsContent value="detaljer" className="space-y-6">
          <TraeningDetaljer traening={data.traening} />
        </TabsContent>
        
        {/* # Tilmeld hold-fanen */}
        <TabsContent value="hold" className="space-y-6">
          <TilmeldeHoldForm 
            traeningId={traeningId} 
            alleHold={data.alleHold} 
            tilmeldteHold={data.tilmeldteHold.map(h => h.hold_id)} 
          />
        </TabsContent>
        
        {/* # Tilstedeværelses-fanen */}
        <TabsContent value="deltagere" className="space-y-6">
          <DeltagerListe 
            traeningId={traeningId}
            spillere={data.spillere}
            tilstedevarelse={data.tilstedevaerelsesData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 