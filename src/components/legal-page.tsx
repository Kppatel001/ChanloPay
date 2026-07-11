import Link from 'next/link';
import { Logo } from '@/components/icons';
import { ArrowLeft } from 'lucide-react';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Logo className="h-7 w-7" />
          <span className="font-headline text-xl font-bold">ChanloPay</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-headline text-3xl font-bold md:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        )}
        <div className="legal-content mt-8 space-y-6 font-body leading-relaxed text-foreground/85">
          {children}
        </div>

        <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/security" className="hover:text-primary">Security</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-headline text-xl font-semibold text-foreground">{heading}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
