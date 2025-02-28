import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hentHold, hentSpillereTilHold } from "@/lib/db/actions";
import { OFFENSIVE_POSITIONER, DEFENSIVE_POSITIONER, OffensivPosition, DefensivPosition } from "@/lib/db/schema";
import Link from "next/link";
import { notFound } from "next/navigation";
import OpretSpillerDialog from "@/app/hold/[id]/opret-spiller-dialog";

// # Props til siden
interface HoldPageProps {
  params: {
    id: string;
  };
}

// # Interface til offensive/defensive positioner for en spiller
interface Position {
  position: string;
  erPrimaer: boolean;
}

export default async function HoldDetailPage({ params }: HoldPageProps) {
  // # Konverter ID fra string til number
  // # Params er ikke længere en Promise i Next.js 15.2.0
  const { id } = params;
  const holdId = parseInt(id);
  
  // # Tjek om ID er gyldigt
  if (isNaN(holdId)) {
    return notFound();
  }
  
  // # Hent holdet fra databasen
  const hold = await hentHold(holdId);
  
  // # Hvis holdet ikke findes, vis 404
  if (!hold) {
    return notFound();
  }
  
  // # Hent spillere for dette hold
  const spillere = await hentSpillereTilHold(holdId);
  const harSpillere = spillere.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/hold" className="hover:text-primary transition-colors">
          Hold
        </Link>
        <span>/</span>
        <span>{hold.navn}</span>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{hold.navn}</h1>
          <p className="text-muted-foreground">
            Oprettet: {new Date(hold.oprettetDato).toLocaleDateString("da-DK")}
          </p>
        </div>
        
        {/* # Knap til at tilføje spillere */}
        <OpretSpillerDialog holdId={holdId} />
      </div>
      
      {/* # Viser en besked når der ikke er nogen spillere endnu */}
      {!harSpillere && (
        <div className="bg-muted/40 rounded-lg p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-muted-foreground"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 className="text-lg font-medium mb-2">Ingen spillere endnu</h3>
          <p className="text-muted-foreground mb-4">
            Du har ikke tilføjet nogen spillere til dette hold endnu.
          </p>
          <OpretSpillerDialog holdId={holdId} buttonText="Tilføj din første spiller" variant="outline" />
        </div>
      )}
      
      {/* # Viser spillerlisten, hvis der er nogen spillere */}
      {harSpillere && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Spillere</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spillere.map((spiller) => (
              <Card key={spiller.id} className="hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{spiller.navn}</CardTitle>
                      <CardDescription>
                        {spiller.nummer ? `#${spiller.nummer}` : "Intet nummer"}
                      </CardDescription>
                    </div>
                    {/* Viser et målvogter-badge hvis spilleren er MV */}
                    {spiller.erMV && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                        Målvogter
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* # Viser positioner, men kun hvis spilleren ikke er målvogter */}
                  {!spiller.erMV && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Offensive positioner:</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {/* # Primær position får fremhævet stil */}
                          {spiller.offensivePositioner.map((pos: Position) => (
                            <span
                              key={pos.position}
                              className={`px-2 py-1 text-xs rounded-full ${
                                pos.erPrimaer
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "bg-muted"
                              }`}
                            >
                              {pos.position}
                            </span>
                          ))}
                          {spiller.offensivePositioner.length === 0 && (
                            <span className="text-xs text-muted-foreground">Ingen</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Defensive positioner:</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {/* # Primære positioner får fremhævet stil */}
                          {spiller.defensivePositioner.map((pos: Position) => (
                            <span
                              key={pos.position}
                              className={`px-2 py-1 text-xs rounded-full ${
                                pos.erPrimaer
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "bg-muted"
                              }`}
                            >
                              {pos.position}
                            </span>
                          ))}
                          {spiller.defensivePositioner.length === 0 && (
                            <span className="text-xs text-muted-foreground">Ingen</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Forklaring på positioner */}
      <div className="mt-8 p-4 bg-muted/40 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Positionsforklaring</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-1">Offensive positioner:</h4>
            <ul className="text-sm space-y-1">
              <li><span className="font-semibold">VF</span> - Venstre Fløj</li>
              <li><span className="font-semibold">VB</span> - Venstre Back</li>
              <li><span className="font-semibold">PM</span> - Playmaker</li>
              <li><span className="font-semibold">HB</span> - Højre Back</li>
              <li><span className="font-semibold">HF</span> - Højre Fløj</li>
              <li><span className="font-semibold">ST</span> - Streg</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Defensive positioner:</h4>
            <ul className="text-sm space-y-1">
              <li><span className="font-semibold">1</span> - Yderste venstre</li>
              <li><span className="font-semibold">2</span> - Venstre forreste</li>
              <li><span className="font-semibold">3</span> - Centerforsvarer (venstre)</li>
              <li><span className="font-semibold">4</span> - Centerforsvarer (højre)</li>
              <li><span className="font-semibold">5</span> - Højre forreste</li>
              <li><span className="font-semibold">6</span> - Yderste højre</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 