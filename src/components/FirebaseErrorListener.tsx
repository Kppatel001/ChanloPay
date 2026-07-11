'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error'
 * events and surfaces them to the user as a non-blocking toast.
 *
 * Previously this component threw the error into the React tree, which would
 * unmount the entire app on any single denied Firestore read/write. Showing a
 * toast (and logging full details to the console for developers) keeps the app
 * usable while still making the failure visible.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Full, structured details for developers.
      console.error('Firestore permission error:', error);

      toast({
        variant: 'destructive',
        title: 'Action could not be completed',
        description:
          'You may not have permission to do that, or your session may have expired. Please refresh and try again.',
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component renders nothing.
  return null;
}
