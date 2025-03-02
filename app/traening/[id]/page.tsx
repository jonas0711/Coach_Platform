import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  hentHold, 
  hentTraeningerTilHold 
} from "@/lib/db/actions";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, ClockIcon, InfoIcon } from "lucide-react";
import { OpretTraeningDialog } from "./opret-traening-dialog";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Toaster } from "sonner";

// # Funktion der genererer metadata for siden (sidertitel)
export async function generateMetadata({ params }: { params: { id: string } }) {
  const hold = await hentHold(parseInt(params.id));
  
  return {
    title: hold ? `Træninger for ${hold.navn}` : "Hold ikke fundet",
  };
}

// # Hovedkomponent for visning af træninger for et hold
export default async function HoldTraeningerPage({ params }: { params: { id: string } }) {
  // # Konverter id til et tal
  const holdId = parseInt(params.id);
  
  // # Hent holdet og dets træninger
  const hold = await hentHold(holdId);
  
  // # Hvis holdet ikke findes, vis 404-side
  if (!hold) {
    notFound();
  }
  
  // # Hent alle træninger for dette hold
  const traeninger = await hentTraeningerTilHold(holdId);
  
  return (
    <div className="space-y-6">
      {/* # Toast-notifikationer */}
      <Toaster position="top-center" />
      
      {/* # Topsektion med navigation og titel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/traening">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Træninger for {hold.navn}</h1>
        </div>
        <p className="text-muted-foreground">
          Her kan du se og administrere træningssessioner for holdet.
        </p>
      </div>
      
      {/* # Knapper til handling */}
      <div className="flex justify-between items-center">
        <OpretTraeningDialog holdId={holdId} />
      </div>
      
      {/* # Liste over træninger */}
      <div className="grid gap-6 mt-6">
        {traeninger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <InfoIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold tracking-tight">Ingen træninger endnu</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Der er ikke oprettet nogen træninger for dette hold endnu.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {traeninger.map((traening) => (
              <Card key={traening.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{traening.navn}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(traening.dato), "PPP", { locale: da })}
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {traening.beskrivelse ? (
                    <p className="line-clamp-3">{traening.beskrivelse}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Ingen beskrivelse</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>Oprettet {format(new Date(traening.oprettetDato), "PPP", { locale: da })}</span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/traening/${holdId}/${traening.id}`}>
                      Detaljer
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 