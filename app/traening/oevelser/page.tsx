import { Suspense } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { hentAlleOevelser, hentAlleKategorier, hentAlleFokuspunkter } from "@/lib/db/actions";
import { OFFENSIVE_POSITIONER, DEFENSIVE_POSITIONER } from "@/lib/db/schema";
import { OevelseForm } from "./_components/oevelse-form";
import { ArrowLeft, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OevelsesListe } from "./_components/oevelse-liste";
import { LoadingOevelser } from "./_components/loading-oevelser";

// # Øvelsesbibliotek side
export default async function OevelserPage() {
  // # Hent alle kategorier og fokuspunkter til formularen
  const kategorier = await hentAlleKategorier();
  const fokuspunkter = await hentAlleFokuspunkter();
  
  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Øvelsesbibliotek</h1>
          <p className="mt-2 text-muted-foreground">
            Her kan du se alle øvelser og oprette nye til brug i dine træningsplaner.
          </p>
        </div>

        {/* Faneblade til at skifte mellem oversigt og oprettelse */}
        <Tabs defaultValue="oversigt" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="oversigt">Oversigt</TabsTrigger>
            <TabsTrigger value="opret">Opret ny øvelse</TabsTrigger>
          </TabsList>
          
          {/* Oversigt over øvelser */}
          <TabsContent value="oversigt">
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Alle øvelser</h2>
                <Button variant="outline" asChild>
                  <Link href="/traening">Tilbage til træning</Link>
                </Button>
              </div>
              
              <Suspense fallback={<LoadingOevelser />}>
                <OevelsesListe />
              </Suspense>
            </div>
          </TabsContent>
          
          {/* Formular til at oprette ny øvelse */}
          <TabsContent value="opret">
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Opret ny øvelse</h2>
                <Button variant="outline" asChild>
                  <Link href="/traening">Tilbage til træning</Link>
                </Button>
              </div>
              
              <OevelseForm 
                offensivePositioner={[...OFFENSIVE_POSITIONER]}
                defensivePositioner={[...DEFENSIVE_POSITIONER]}
                kategorier={kategorier.map(kat => kat.navn)}
                fokuspunkter={fokuspunkter.map(fp => fp.tekst)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 