// Importerer nødvendige komponenter og funktioner
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RedigerOevelseKnap } from "../_components/rediger-oevelse-knap";
import { SletOevelseDialog } from "../_components/slet-oevelse-dialog";
import { hentOevelse } from "@/lib/db/actions";

// Interface for position
interface Position {
  oevelseId: number;
  position: string;
  antalKraevet: number;
  erOffensiv: boolean;
}

// Interface for fokuspunkt
interface Fokuspunkt {
  id: number;
  tekst: string;
  oprettetDato: Date;
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
  // Destrukturer id direkte fra params
  const { id } = params;

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
    const oevelse = await hentOevelse(oevelseId);
    
    // Hvis øvelsen ikke findes, omdirigerer til øvelsessiden
    if (!oevelse) {
      console.error('Øvelse ikke fundet med ID:', oevelseId);
      redirect("/traening/oevelser");
    }

    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto">
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
                    <h3 className="font-medium">Krævede positioner:</h3>
                    <div className="flex flex-wrap gap-2">
                      {oevelse.positioner && oevelse.positioner.length > 0 ? (
                        oevelse.positioner.map((position: Position) => (
                          <Badge key={`${position.oevelseId}-${position.position}`} variant="secondary">
                            {position.position} ({position.antalKraevet})
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Ingen positioner specificeret</p>
                      )}
                    </div>
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
                    {oevelse.fokuspunkter.map((punkt: Fokuspunkt) => (
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