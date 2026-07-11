import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Logo className="h-8 w-8" />
        <span className="font-headline text-2xl font-bold">ChanloPay</span>
      </div>
      <p className="mb-1 font-headline text-5xl font-bold text-primary">404</p>
      <h1 className="mb-2 font-headline text-xl font-bold">Page not found</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
