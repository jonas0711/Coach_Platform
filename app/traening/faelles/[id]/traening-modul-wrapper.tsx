'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// # Props til TraeningModul komponenten (kopieret fra original komponent)
interface TraeningModulProps {
  traeningId: number;
}

// # Indlæs TraeningModul dynamisk med korrekt type
const TraeningModul = dynamic<TraeningModulProps>(
  () => import('./traening-modul').then(mod => mod.TraeningModul),
  {
    ssr: false,
    loading: () => <div className="p-4 text-center">Indlæser træningsmodul...</div>
  }
);

// # Props til TraeningModulWrapper (samme som til TraeningModul)
interface TraeningModulWrapperProps {
  traeningId: number;
}

// # Client side wrapper til TraeningModul komponenten
export function TraeningModulWrapper({ traeningId }: TraeningModulWrapperProps) {
  return <TraeningModul traeningId={traeningId} />;
} 