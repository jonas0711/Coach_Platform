import React from "react";
import Link from "next/link";
import { OpretFaellesTraeningForm } from "./opret-faelles-traening-form";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { hentAlleHold } from "@/lib/db/actions";

// # Metadata for siden
export const metadata = {
  title: "Opret Fælles Træning",
  description: "Opret en ny træningssession på tværs af flere hold",
};

// # Hovedkomponent for oprettelse af fælles træning
export default async function OpretFaellesTraeningPage() {
  // # Hent alle hold til brug i formularen
  const hold = await hentAlleHold();
  
  return (
    <div className="space-y-6">
      {/* # Topsektion med navigation og titel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/traening/faelles">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Opret Fælles Træning</h1>
        </div>
        <p className="text-muted-foreground">
          Opret en ny træningssession der kan inkludere spillere fra flere hold.
        </p>
      </div>
      
      {/* # Formular til oprettelse af træning */}
      <div className="max-w-2xl">
        {hold.length === 0 ? (
          <div className="p-6 bg-muted rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Der er ingen hold</h2>
            <p className="text-muted-foreground mb-4">
              Du skal oprette mindst ét hold, før du kan oprette en træning.
            </p>
            <Button asChild>
              <Link href="/hold">Gå til Hold</Link>
            </Button>
          </div>
        ) : (
          <OpretFaellesTraeningForm hold={hold} />
        )}
      </div>
    </div>
  );
} 