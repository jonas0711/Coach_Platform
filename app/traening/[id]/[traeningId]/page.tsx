import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  hentHold, 
  hentTraening,
  hentSpillereTilHold
} from "@/lib/db/actions";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { RedigerTraeningDialog } from "../rediger-traening-dialog";
import { SletTraeningDialog } from "../slet-traening-dialog";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Toaster } from "sonner";
import { TilstedeRegistrering } from "./tilstede";

// # Funktion der genererer metadata for siden (sidertitel)
export async function generateMetadata({ params }: { params: { id: string, traeningId: string } }) {
  const traening = await hentTraening(parseInt(params.traeningId));
  
  return {
    title: traening ? `${traening.navn} - Træning` : "Træning ikke fundet",
  };
}

// # Hovedkomponent for visning af træning
export default async function TraeningDetaljerPage({ params }: { params: { id: string, traeningId: string } }) {
  // # Konverter id'er til tal
  const holdId = parseInt(params.id);
  const traeningId = parseInt(params.traeningId);
  
  // # Hent holdet og træningen
  const hold = await hentHold(holdId);
  const traening = await hentTraening(traeningId);
  const spillere = await hentSpillereTilHold(holdId);
  
  // # Hvis holdet eller træningen ikke findes, vis 404-side
  if (!hold || !traening) {
    notFound();
  }
  
  // # Sikre at træningen faktisk tilhører dette hold
  if (traening.holdId !== holdId) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      {/* # Toast-notifikationer */}
      <Toaster position="top-center" />
      
      {/* # Topsektion med navigation og titel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/traening/${holdId}`}>
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{traening.navn}</h1>
        </div>
        <p className="text-muted-foreground">
          Detaljer om træningssessionen for {hold.navn}.
        </p>
      </div>
      
      {/* # Handlingsknapper */}
      <div className="flex justify-end gap-2">
        <RedigerTraeningDialog 
          traeningId={traeningId} 
          initialData={{
            navn: traening.navn,
            beskrivelse: traening.beskrivelse,
            dato: traening.dato
          }} 
        />
        <SletTraeningDialog 
          traeningId={traeningId} 
          traeningNavn={traening.navn} 
        />
      </div>
      
      {/* # Træningsdetaljer */}
      <Card>
        <CardHeader>
          <CardTitle>Træningsinformation</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {format(new Date(traening.dato), "PPP", { locale: da })}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* # Beskrivelse */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Beskrivelse</h3>
            {traening.beskrivelse ? (
              <p className="whitespace-pre-line">{traening.beskrivelse}</p>
            ) : (
              <p className="text-muted-foreground italic">Ingen beskrivelse</p>
            )}
          </div>
          
          {/* # Metadata om oprettelse */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClockIcon className="h-3 w-3" />
              <span>Oprettet {format(new Date(traening.oprettetDato), "PPP', kl. 'HH:mm", { locale: da })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* # Tilstedeværelse */}
      <TilstedeRegistrering spillere={spillere.map(s => ({
        id: s.id,
        navn: s.navn,
        nummer: s.nummer,
        erMV: s.erMV
      }))} />
      
      {/* # Her kan der tilføjes yderligere sektioner senere, som f.eks. øvelser, noter mv. */}
    </div>
  );
} 