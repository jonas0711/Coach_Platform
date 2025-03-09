import { NextRequest, NextResponse } from 'next/server';
import { hentOevelse } from '@/lib/db/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sikr at params er awaitede før vi bruger dem
    const { id } = await Promise.resolve(params);
    const numId = parseInt(id);
    
    console.log('DEBUG: Henter øvelse med ID:', numId);
    
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Ugyldigt ID' }, { status: 400 });
    }
    
    const oevelse = await hentOevelse(numId);
    
    if (!oevelse) {
      return NextResponse.json({ error: 'Øvelse ikke fundet' }, { status: 404 });
    }
    
    console.log('DEBUG: Fandt øvelse:', oevelse.navn);
    
    if (oevelse.positioner) {
      console.log('DEBUG: Fandt', oevelse.positioner.length, 'positioner for øvelsen');
    }
    
    if (oevelse.variationer) {
      console.log('DEBUG: Fandt', oevelse.variationer.length, 'variationer for øvelsen');
      console.log('DEBUG: Variationsdata:', JSON.stringify(oevelse.variationer, null, 2));
      
      for (const variation of oevelse.variationer) {
        if (variation.positioner) {
          console.log(`DEBUG: Variation "${variation.navn}" har ${variation.positioner.length} positioner`);
        }
      }
    }
    
    return NextResponse.json(oevelse);
  } catch (error) {
    console.error('Fejl ved hentning af øvelse:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl ved hentning af øvelse' },
      { status: 500 }
    );
  }
} 