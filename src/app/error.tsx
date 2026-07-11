'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Logo className="h-8 w-8" />
        <span className="font-headline text-2xl font-bold">ChanloPay</span>
      </div>
      <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mb-2 font-headline text-xl font-bold">Something went wrong</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. You can try again, and if the problem
        continues, please refresh the page.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
