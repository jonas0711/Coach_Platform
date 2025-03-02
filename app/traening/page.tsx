import React from "react";
import { hentAlleHold } from "@/lib/db/actions";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, UsersIcon, ClipboardIcon } from 'lucide-react';

export default async function TraeningPage() {
  // # Hent alle hold så brugeren kan vælge hvilket hold der skal vises træninger for
  const hold = await hentAlleHold();

  return (
    <div className="space-y-6">
      {/* # Overskrift på siden */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Træninger</h1>
        <p className="text-muted-foreground">
          Vælg et hold for at se eller oprette træninger for det pågældende hold.
        </p>
      </div>

      {/* # Hvis der ikke er nogen hold endnu, vis en besked */}
      {hold.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">Ingen hold fundet</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            Du skal oprette et hold, før du kan oprette træninger.
          </p>
          <Button asChild>
            <Link href="/hold">Gå til Hold</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* # Vis kort for hvert hold */}
          {hold.map((h) => (
            <Link key={h.id} href={`/traening/${h.id}`} className="block">
              <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>{h.navn}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Oprettet {new Date(h.oprettetDato).toLocaleDateString('da-DK')}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UsersIcon className="h-4 w-4" />
                    <span>Se træninger for dette hold</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 