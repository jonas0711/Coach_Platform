import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function TraenerPage() {
  // # Dette er siden for træner-sektionen
  // # Her kan brugeren planlægge træningssessioner og få adgang til øvelser
  return (
    <div className="space-y-6">
      <section>
        {/* # Overskrift og beskrivelse af træner-sektionen */}
        <h1 className="text-3xl font-bold mb-2">Trænerværktøjer</h1>
        <p className="text-muted-foreground mb-6">
          Planlæg træningssessioner og få adgang til øvelsesbiblioteket.
        </p>
        
        {/* # Knapper til hovedfunktioner */}
        <div className="flex flex-wrap gap-4 mb-8">
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
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Planlæg ny træning
          </Button>
          <Button variant="outline">
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
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Øvelsesbibliotek
          </Button>
        </div>
      </section>
      
      {/* # Genveje til forskellige værktøjer */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Trænerværktøjer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* # Kort til træningsplanlægning */}
          <Card>
            <CardHeader>
              <CardTitle>Træningsplanlægning</CardTitle>
              <CardDescription>Opret og tilpas træningssessioner</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Lav strukturerede træningsplaner med øvelser, tidsplaner og fokusområder.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Planlæg træning</Button>
            </CardFooter>
          </Card>
          
          {/* # Kort til øvelsesbibliotek */}
          <Card>
            <CardHeader>
              <CardTitle>Øvelsesbibliotek</CardTitle>
              <CardDescription>Find og opret øvelser</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Søg blandt øvelser eller opret dine egne tilpassede øvelser til dine hold.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Gå til bibliotek</Button>
            </CardFooter>
          </Card>
          
          {/* # Kort til træningsevaluering */}
          <Card>
            <CardHeader>
              <CardTitle>Træningsevaluering</CardTitle>
              <CardDescription>Evaluer dine træningssessioner</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Registrer feedback og resultater fra gennemførte træninger.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Evaluer træning</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      {/* # Kommende træninger sektion */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Kommende Træninger</h2>
        <div className="bg-muted/40 rounded-lg p-8 text-center">
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
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Ingen kommende træninger</h3>
          <p className="text-muted-foreground mb-4">
            Du har ikke planlagt nogen kommende træninger. Planlæg din første træning for at komme i gang.
          </p>
          <Button>Planlæg første træning</Button>
        </div>
      </section>
    </div>
  )
} 