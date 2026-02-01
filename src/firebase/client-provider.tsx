'use client';

import React from 'react';
import { initializeFirebase, FirebaseProvider } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const firebase = initializeFirebase();

  return (
    <FirebaseProvider value={firebase}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
