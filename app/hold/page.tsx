import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function HoldPage() {
  // # Dette er siden for hold-sektionen
  // # Her kan brugeren se oversigt over sine hold og administrere dem
  return (
    <div className="space-y-6">
      <section>
        {/* # Overskrift og beskrivelse af hold-sektionen */}
        <h1 className="text-3xl font-bold mb-2">Mine Hold</h1>
        <p className="text-muted-foreground mb-6">
          Få overblik over dine håndboldhold og administrer spillere.
        </p>
        
        {/* # Knap til at oprette nye hold */}
        <div className="mb-8">
          <Button>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="mr-2"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Opret nyt hold
          </Button>
        </div>
        
        {/* # Viser en besked når der ikke er nogen hold endnu */}
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
          <Button variant="outline">
            Kom i gang med dit første hold
          </Button>
        </div>
      </section>
      
      {/* # Sektion til fremtidige hold (vises når der er hold i systemet) */}
      {/* 
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Mine Hold</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holds.map((hold) => (
            <Card key={hold.id}>
              <CardHeader>
                <CardTitle>{hold.navn}</CardTitle>
                <CardDescription>{hold.aldersgruppe}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Antal spillere: {hold.antalSpillere}</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Se detaljer</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      */}
    </div>
  )
} 