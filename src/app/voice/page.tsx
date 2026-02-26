import React, { Suspense } from 'react';
import VoiceClient from './VoiceClient';

export default function VoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-4">
          <div className="mx-auto w-full max-w-md pt-12 text-center text-sm text-muted-foreground">
            Connecting…
          </div>
        </div>
      }
    >
      <VoiceClient />
    </Suspense>
  );
}
