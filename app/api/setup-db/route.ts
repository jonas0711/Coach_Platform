import { NextResponse } from 'next/server';
import { setupTraeningOevelserTable } from '@/lib/db/setup-traening-oevelser';

// # API-rute til at oprette traening_oevelser tabellen
export async function GET() {
  try {
    // # Kald setup-funktionen
    const result = await setupTraeningOevelserTable();
    
    // # Returner resultatet
    return NextResponse.json(
      { success: result.success, message: result.message },
      { status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Fejl ved API-kald:", error);
    return NextResponse.json(
      { success: false, message: `Der opstod en fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}` },
      { status: 500 }
    );
  }
} 