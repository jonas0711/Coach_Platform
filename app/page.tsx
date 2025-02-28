import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  // # Dette er forsiden af vores trænerplatform
  // # Den viser to hoved-sektioner: Hold og Træner
  return (
    <div className="space-y-12">
      {/* # Hero sektion med velkomst, beskrivelse */}
      <section className="text-center py-8 space-y-6 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Velkommen til Coach Platform</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Din personlige platform til at holde overblik over håndboldhold og planlægge effektive træninger
        </p>
      </section>

      {/* # Dashboard med store kort der giver adgang til hovedsektionerne */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {/* # Kort til Hold-sektionen */}
        <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all h-full cursor-pointer group">
          <Link href="/hold" className="block h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">Hold</CardTitle>
              <CardDescription>
                Administrer dine håndboldhold
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                {/* # Ikon for hold-sektionen */}
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <p>Få overblik over dine hold, spillere og holdstatistikker. Administrer holdlister, præstationer og fremmøde.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                Gå til Hold
              </Button>
            </CardFooter>
          </Link>
        </Card>
        
        {/* # Kort til Træner-sektionen */}
        <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all h-full cursor-pointer group">
          <Link href="/traener" className="block h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">Træner</CardTitle>
              <CardDescription>
                Planlæg træningssessioner
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                {/* # Ikon for træner-sektionen */}
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <p>Opret, organiser og planlæg effektive træningssessioner. Få adgang til øvelsesbibliotek, træningsplaner og evalueringsværktøjer.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                Gå til Træner
              </Button>
            </CardFooter>
          </Link>
        </Card>
      </section>

      {/* # Quick Access Dashboard sektion */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Hurtig Adgang</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* # Hurtig adgang kort */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Kommende Træninger</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Ingen kommende træninger planlagt</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Seneste Aktivitet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Ingen nylige aktiviteter</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Hurtig Statistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Aktive Hold:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Spillere:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Træninger denne måned:</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
