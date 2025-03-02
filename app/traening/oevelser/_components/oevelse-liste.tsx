// Importerer nødvendige komponenter og funktioner
import Link from "next/link";
import { hentAlleOevelser } from "@/lib/db/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpretOevelseKnap } from "./opret-oevelse-knap";
import { SletOevelseDialog } from "./slet-oevelse-dialog";
import { RedigerOevelseKnap } from "./rediger-oevelse-knap";

// Denne komponent viser alle øvelser i en liste
// Den henter data asynkront fra databasen
export async function OevelsesListe() {
  // Henter alle øvelser fra databasen
  const oevelser = await hentAlleOevelser();

  // Hvis der ikke er nogen øvelser, viser vi en besked
  if (oevelser.length === 0) {
    return (
      <div className="col-span-full text-center p-8 bg-muted/40 rounded-lg">
        <p className="text-muted-foreground mb-4">
          Du har ikke oprettet nogen øvelser endnu.
        </p>
        <OpretOevelseKnap />
      </div>
    );
  }

  // Ellers viser vi alle øvelser som kort
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {oevelser.map((oevelse) => (
        <Card key={oevelse.id} className="overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{oevelse.navn}</CardTitle>
                <CardDescription>
                  {oevelse.kategoriNavn ? (
                    <span className="inline-block bg-muted px-2 py-1 rounded-md text-xs mt-1">
                      {oevelse.kategoriNavn}
                    </span>
                  ) : (
                    oevelse.brugerPositioner 
                      ? "Positionsbaseret øvelse" 
                      : `Minimum ${oevelse.minimumDeltagere} deltagere`
                  )}
                </CardDescription>
              </div>
              <div className="flex space-x-1">
                <RedigerOevelseKnap oevelseId={oevelse.id} />
                <SletOevelseDialog oevelseId={oevelse.id} oevelseNavn={oevelse.navn} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-3 flex-grow">
            {oevelse.billedeSti && (
              <div className="relative w-full h-40 mb-4">
                <img 
                  src={oevelse.billedeSti} 
                  alt={oevelse.navn} 
                  className="object-cover rounded-md w-full h-full"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground line-clamp-3">
              {oevelse.beskrivelse || "Ingen beskrivelse"}
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/traening/oevelser/${oevelse.id}`}>
                Se detaljer
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 