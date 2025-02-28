import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  // # Dette er forsiden af vores boilerplate
  // # Den viser en velkomst og tre cards med information om de anvendte teknologier
  return (
    <div className="space-y-12">
      {/* # Hero sektion med velkomst, beskrivelse og handlingsknapper */}
      <section className="text-center py-8 space-y-6 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Velkommen til min boilerplate</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          En hurtig start på Next.js projekter med Shadcn og DaisyUI
        </p>
        <div className="flex gap-4 justify-center mt-4">
          <Button asChild size="lg" className="px-6 py-6 h-auto text-base">
            <Link href="/dashboard">Gå til Dashboard</Link>
          </Button>
          <Button variant="outline" size="lg" className="px-6 py-6 h-auto text-base">
            <Link href="#">Læs dokumentation</Link>
          </Button>
        </div>
      </section>

      {/* # Grid af kort der beskriver forskellige teknologier */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {/* # Kort der beskriver Next.js */}
        <Card className="border-2 hover:border-primary/50 transition-all h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Next.js</CardTitle>
            <CardDescription>
              React framework med app router
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <p>App Router med page.tsx og layout.tsx struktur</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
                Læs mere
              </a>
            </Button>
          </CardFooter>
        </Card>
        
        {/* # Kort der beskriver Shadcn/UI */}
        <Card className="border-2 hover:border-primary/50 transition-all h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Shadcn/UI</CardTitle>
            <CardDescription>
              Genbrugelige komponenter
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <p>Komponenter bygget med Radix UI og Tailwind</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">
                Læs mere
              </a>
            </Button>
          </CardFooter>
        </Card>
        
        {/* # Kort der beskriver DaisyUI */}
        <Card className="border-2 hover:border-primary/50 transition-all h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">DaisyUI</CardTitle>
            <CardDescription>
              Tailwind CSS komponentbibliotek
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <p>Færdige CSS klasser til hurtig styling</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href="https://daisyui.com" target="_blank" rel="noopener noreferrer">
                Læs mere
              </a>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}
