'use client';

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Users, Calendar, Trash2 } from "lucide-react";
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
import { sletTraening } from "@/app/traening/actions";

// # Interface for træningsdata som bliver sendt til komponentet
interface TraeningMedHold {
  id: number;
  navn: string;
  beskrivelse: string | null;
  dato: Date;
  oprettetDato: Date;
  flereTilmeldte: boolean;
  holdCount: number;
  holdNavne: string[];
}

// # Client-side komponent til at vise et træningskort med slettefunktion
export default function TraeningCard({ traening }: { traening: TraeningMedHold }) {
  // # Håndterer sletning af træningen
  const handleSlet = async () => {
    // # Bekræft med brugeren før sletning
    if (confirm(`Er du sikker på, at du vil slette træningen "${traening.navn}"?`)) {
      await sletTraening(traening.id);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="truncate">{traening.navn}</CardTitle>
            {traening.beskrivelse && (
              <CardDescription className="line-clamp-2">
                {traening.beskrivelse}
              </CardDescription>
            )}
          </div>
          <form action={handleSlet}>
            <Button 
              variant="ghost" 
              size="icon" 
              type="submit"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Slet træning"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Slet træning</span>
            </Button>
          </form>
        </div>
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
      <CardFooter className="pt-1 flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href={`/traening/faelles/${traening.id}`}>
            Administrer træning
          </Link>
        </Button>
        
        {/* # Ekstra sletteknap kun for holdtræninger */}
        {!traening.flereTilmeldte && (
          <form action={handleSlet} className="w-full">
            <Button 
              variant="outline" 
              type="submit"
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Slet træning
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
} 