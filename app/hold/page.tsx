import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { hentAlleHold } from "@/lib/db/actions"
import OpretHoldDialog from "@/app/hold/opret-hold-dialog"

export default async function HoldPage() {
  // # Dette er siden for hold-sektionen
  // # Her kan brugeren se oversigt over sine hold og administrere dem
  
  // # Hent alle hold fra databasen
  const hold = await hentAlleHold();
  const harHold = hold.length > 0;
  
  return (
    <div className="space-y-6">
      <section>
        {/* # Overskrift og beskrivelse af hold-sektionen */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mine Hold</h1>
            <p className="text-muted-foreground">
              Få overblik over dine håndboldhold og administrer spillere.
            </p>
          </div>
          
          {/* # Knap til at oprette nye hold */}
          <OpretHoldDialog />
        </div>
        
        {/* # Viser en besked når der ikke er nogen hold endnu */}
        {!harHold && (
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
            <h3 className="text-lg font-medium mb-2">Ingen hold endnu</h3>
            <p className="text-muted-foreground mb-4">
              Du har ikke oprettet nogen hold endnu. Opret dit første hold for at komme i gang.
            </p>
            <OpretHoldDialog buttonText="Kom i gang med dit første hold" variant="outline" />
          </div>
        )}
        
        {/* # Viser holdene, hvis der er nogen */}
        {harHold && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {hold.map((holdItem) => (
              <Card key={holdItem.id} className="hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle>{holdItem.navn}</CardTitle>
                  <CardDescription>
                    Oprettet: {new Date(holdItem.oprettetDato).toLocaleDateString('da-DK')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Klik for at se spillere og detaljer.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/hold/${holdItem.id}`}>
                      Se holddetaljer
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
} 