// Importerer nødvendige komponenter og funktioner
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RedigerOevelseKnap } from "../_components/rediger-oevelse-knap";
import { SletOevelseDialog } from "../_components/slet-oevelse-dialog";
import { hentOevelse } from "@/lib/db/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Interface for position fra databasen
interface DbPosition {
  oevelseId: number;
  position: string;
  antalKraevet: number;
  erOffensiv: boolean;
  variationId: number | null;
}

// Interface for fokuspunkt fra databasen
interface DbFokuspunkt {
  id: number;
  tekst: string;
}

// Interface for variation fra databasen
interface DbVariation {
  id: number;
  navn: string;
  beskrivelse?: string;
}

// Interface for kategori fra databasen
interface DbKategori {
  id: number;
  navn: string;
  oprettetDato: Date;
}

// Interface for øvelse fra databasen
interface DbOevelse {
  id: number;
  navn: string;
  beskrivelse?: string;
  billedeSti?: string;
  brugerPositioner: boolean;
  minimumDeltagere?: number;
  originalPositionerNavn?: string;
  kategori: DbKategori | null;
  positioner: DbPosition[];
  variationer: DbVariation[];
  fokuspunkter: DbFokuspunkt[];
}

// Sikrer dynamisk opdatering af siden
export const dynamic = "force-dynamic";

// Props interface
interface PageProps {
  params: {
    id: string;
  };
}

// Hovedkomponent for øvelsesdetaljer
export default async function OevelseDetaljerPage({ params }: PageProps) {
  // Await params før vi bruger dens properties
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Valider ID
  if (!id) {
    console.error('Intet ID angivet');
    redirect("/traening/oevelser");
  }

  // Parse ID
  const oevelseId = parseInt(id);
  if (isNaN(oevelseId) || oevelseId <= 0) {
    console.error('ID er ikke et gyldigt positivt tal:', id);
    redirect("/traening/oevelser");
  }

  try {
    // Henter øvelsesdata fra databasen
    const oevelse = await hentOevelse(oevelseId) as DbOevelse;
    
    // Hvis øvelsen ikke findes, omdirigerer til øvelsessiden
    if (!oevelse) {
      console.error('Øvelse ikke fundet med ID:', oevelseId);
      redirect("/traening/oevelser");
    }

    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" asChild className="mb-4">
              <Link href="/traening/oevelser" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Tilbage til oversigt</span>
              </Link>
            </Button>
          </div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">{oevelse.navn}</h1>
              {oevelse.kategori && (
                <Badge variant="outline" className="mt-2">
                  {oevelse.kategori.navn}
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <RedigerOevelseKnap oevelseId={oevelse.id} />
              <SletOevelseDialog oevelseId={oevelse.id} oevelseNavn={oevelse.navn} />
            </div>
          </div>

          <div className="grid gap-6">
            {/* Basisinformation */}
            <Card>
              <CardHeader>
                <CardTitle>Beskrivelse</CardTitle>
              </CardHeader>
              <CardContent>
                {oevelse.beskrivelse ? (
                  <p className="whitespace-pre-line">{oevelse.beskrivelse}</p>
                ) : (
                  <p className="text-muted-foreground italic">Ingen beskrivelse tilføjet</p>
                )}
              </CardContent>
            </Card>

            {/* Billede hvis det findes */}
            {oevelse.billedeSti && (
              <Card>
                <CardHeader>
                  <CardTitle>Illustration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full max-w-2xl mx-auto">
                    <img 
                      src={oevelse.billedeSti} 
                      alt={oevelse.navn} 
                      className="rounded-lg object-cover w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deltagerinformation */}
            <Card>
              <CardHeader>
                <CardTitle>Deltagere</CardTitle>
              </CardHeader>
              <CardContent>
                {oevelse.brugerPositioner ? (
                  <div className="space-y-4">
                    {/* Hovedpositioner */}
                    <div>
                      <h3 className="font-medium mb-2">
                        {oevelse.originalPositionerNavn || "Hovedpositioner"}:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {oevelse.positioner && oevelse.positioner.length > 0 ? (
                          oevelse.positioner
                            .filter((position) => !position.variationId)
                            .map((position) => (
                              <Badge key={`${position.oevelseId}-${position.position}`} variant="secondary">
                                {position.position} ({position.antalKraevet})
                              </Badge>
                            ))
                        ) : (
                          <p className="text-muted-foreground">Ingen hovedpositioner specificeret</p>
                        )}
                      </div>
                    </div>

                    {/* Variationer */}
                    {oevelse.variationer && oevelse.variationer.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Variationer:</h3>
                        <div className="space-y-4">
                          {oevelse.variationer.map((variation) => (
                            <div key={variation.id} className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">{variation.navn}</h4>
                              {variation.beskrivelse && (
                                <p className="text-sm text-muted-foreground mb-2">{variation.beskrivelse}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {oevelse.positioner
                                  .filter((position) => position.variationId === variation.id)
                                  .map((position) => (
                                    <Badge key={`${position.oevelseId}-${position.variationId}-${position.position}`} variant="outline">
                                      {position.position} ({position.antalKraevet})
                                    </Badge>
                                  ))
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Minimum {oevelse.minimumDeltagere} deltager(e)</p>
                )}
              </CardContent>
            </Card>

            {/* Fokuspunkter */}
            {oevelse.fokuspunkter && oevelse.fokuspunkter.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Fokuspunkter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {oevelse.fokuspunkter.map((punkt) => (
                      <Badge key={punkt.id} variant="outline">
                        {punkt.tekst}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Fejl ved håndtering af øvelsesvisning:', error);
    redirect("/traening/oevelser");
  }
} 