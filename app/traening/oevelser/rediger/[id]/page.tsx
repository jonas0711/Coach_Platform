// Importerer nødvendige funktioner og komponenter
import { redirect } from "next/navigation";
import { OevelseRedigerForm } from "../../_components/oevelse-rediger-form";
import { hentOevelse } from "@/lib/db/actions";

// Definerer sidekonfiguration for at sikre dynamisk opdatering
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Hovedkomponenten for redigeringssiden
export default async function RedigerOevelsePage(props: {
  params: { id: string };
}) {
  try {
    // # Await params objektet korrekt
    const params = await props.params;
    
    // # Validerer at id er en gyldig streng
    if (!params.id || typeof params.id !== 'string') {
      console.error('Ugyldigt ID format:', params.id);
      redirect("/traening/oevelser");
    }
    
    // # Konverterer til nummer og validerer
    const oevelseId = parseInt(params.id);
    if (isNaN(oevelseId) || oevelseId <= 0) {
      console.error('ID er ikke et gyldigt positivt tal:', params.id);
      redirect("/traening/oevelser");
    }

    // # Henter øvelsesdata fra databasen
    const oevelse = await hentOevelse(oevelseId);
    
    // # Hvis øvelsen ikke findes, omdirigerer til øvelsessiden
    if (!oevelse) {
      console.error('Øvelse ikke fundet med ID:', oevelseId);
      redirect("/traening/oevelser");
    }

    return (
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Rediger øvelse</h1>
          <p className="text-muted-foreground mt-1">
            Opdater detaljer for øvelsen "{oevelse.navn}"
          </p>
        </div>
        <OevelseRedigerForm oevelse={oevelse} />
      </div>
    );
  } catch (error) {
    console.error('Fejl ved håndtering af øvelsesredigering:', error);
    redirect("/traening/oevelser");
  }
} 